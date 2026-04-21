import asyncHandler from "../utils/asyncHandler.js";
import ApiResponse from "../utils/ApiResponse.js";
import ApiError from "../utils/ApiError.js";
import Reservation from "../models/reservation.models.js";
import {
  buildConflictQuery,
  validateTimeFormat,
  toMinutes,
  getTableRange,
  getPossibleTables,
  requiredField} from "../utils/helper.js";
import Table from "../models/table.models.js";
import { tableReservationStatus } from "../utils/constants.js";

// ===================== CREATE RESERVATION =====================
const newTableReservation = asyncHandler(async (req, res) => {
  const {
    tableNo,
    startTime,
    endTime,
    date,
    noOfGuests,
    name,
    phoneNumber,
    specialRequests = "",
    reservationUserEmail,
  } = req.body;

  console.log("Request Body:", req.body);

  // Validate required fields
  if (!tableNo || !startTime || !endTime || !date || !noOfGuests || !name || !phoneNumber) {
    throw new ApiError(400, "All required fields must be provided");
  }

  // Validate time format
  if (!validateTimeFormat(startTime) || !validateTimeFormat(endTime)) {
    throw new ApiError(400, "Invalid time format. Expected HH:mm");
  }

  // Convert times to minutes
  const startMin = toMinutes(startTime);
  const endMin = toMinutes(endTime);

  console.log("Start Time (minutes):", startMin);
  console.log("End Time (minutes):", endMin);

  // Validate time logic
  if (startMin >= endMin) {
    throw new ApiError(400, "End time must be after start time");
  }

  // Validate date
  const parsedDate = new Date(date);
  if (isNaN(parsedDate.getTime())) {
    throw new ApiError(400, "Invalid date format");
  }

  console.log("Parsed Date:", parsedDate);

  // Check if table is already booked for this time slot
  const existingBooking = await Table.findOne({
    tableNumber: tableNo,
    date: parsedDate,
    tableStatus: { $ne: tableReservationStatus.CANCELLED },
    $or: [
      {
        startTimeInMinutes: { $lt: endMin },
        endTimeInMinutes: { $gt: startMin },
      },
    ],
  });

  if (existingBooking) {
    throw new ApiError(409, "Table is already booked for this time slot");
  }

  // Create table reservation
  const tableReservation = {
    tableNumber: tableNo,
    startTime: startTime,
    startTimeInMinutes: startMin,
    numberOfGuest: noOfGuests,
    endTime: endTime,
    endTimeInMinutes: endMin,
    date: parsedDate,
    tableStatus: tableReservationStatus.PENDING,
  };

  console.log("Table Reservation Data:", tableReservation);

  const tableCreated = await Table.create(tableReservation);

  if (!tableCreated) {
    throw new ApiError(500, "Failed to create table reservation");
  }

  console.log("Table Created:", tableCreated);

  // Create main reservation record
  const reservationData = {
    userId: req.user._id,
    userEmail: reservationUserEmail || req.user.email,
    phoneNumber: phoneNumber,
    specialRequests: specialRequests,
    name: name,
    tableId: tableCreated._id,
  };

  console.log("Reservation Data:", reservationData);

  const reservation = await Reservation.create(reservationData);

  if (!reservation) {
    // Rollback table creation if reservation fails
    await Table.findByIdAndDelete(tableCreated._id);
    throw new ApiError(500, "Failed to create reservation");
  }

  console.log("Reservation Created:", reservation);

  return res
    .status(201)
    .json(new ApiResponse(201, reservation, "Reservation created successfully"));
});

// ===================== AVAILABLE TABLES =====================
const availableTableForReservation = asyncHandler(async (req, res) => {
    const { noOfGuests, date, startTime, endTime } = req.body;

    console.log("req.body", req.body)

    const parsedDate = new Date(date);
    console.log("parsedDate", parsedDate)

    const range = getTableRange(Number(noOfGuests));
    console.log("range", range)
    if (!range) throw new ApiError(400, "Invalid guest count");

    const possibleTables = getPossibleTables(range);
    console.log("possibleTables", possibleTables)

    const startOfDay = new Date(parsedDate);
    startOfDay.setHours(0, 0, 0, 0);
    console.log("startOfDay", startOfDay)

    const endOfDay = new Date(parsedDate);
    endOfDay.setHours(23, 59, 59, 999);
    console.log("endOfDay", endOfDay)

    const startMin = toMinutes(startTime);
    const endMin = toMinutes(endTime);
    console.log("startMin", startMin)
    console.log("endMin", endMin)

    if (startMin > endMin) {
        console.log("startTime", startTime)
        console.log("endMin", endMin)
        throw new ApiError(400, "Invalid time range");
    }

    // Corrected overlap query - find ALL tables that are booked during the requested time
    const bookedTables = await Table.find({
        tableNumber: { $in: possibleTables },
        date: { $gte: startOfDay, $lte: endOfDay },
        tableStatus: { $ne: "cancelled" },
        $or: [
              {
                  date : { $in : parsedDate }
              },
            {
                startTimeInMinutes: { $gte: startMin, $lt: endMin }
            },
            {
                endTimeInMinutes: { $gt: startMin, $lte: endMin }
            },
            {
                startTimeInMinutes: { $lte: startMin },
                endTimeInMinutes: { $gte: endMin }
            }
        ]
    });

    console.log("bookedTables", bookedTables)

    const bookedSet = new Set(bookedTables.map((b) => b.tableNumber));
    console.log("bookedSet", bookedSet)

    const freeTables = possibleTables.filter((t) => !bookedSet.has(t));
    console.log("freeTables", freeTables)

    return res.status(200).json(
        new ApiResponse(200, { freeTables }, "Available tables fetched")
    );
});

// ===================== UPDATE STATUS =====================
const updateReservationStatus = asyncHandler(async (req, res) => {
  const { reservationId } = req.params; // Changed from tableReservationId
  const { status, tableStatus } = req.body; // status for Reservation, tableStatus for Table

  if (!status && !tableStatus) {
    throw new ApiError(400, "At least one status is required");
  }

  // Find the reservation first
  const reservation = await Reservation.findById(reservationId);
  if (!reservation) {
    throw new ApiError(404, "Reservation not found");
  }

  let updatedReservation = null;
  let updatedTable = null;

  // Update Reservation status if provided
  if (status) {
    // Note: Your Reservation schema doesn't have a status field
    // You might need to add it. For now, I'll assume you want to update tableStatus
    // through the associated Table document
    updatedReservation = await Reservation.findByIdAndUpdate(
      reservationId,
      { $set: req.body }, // Update any fields that exist in the schema
      { new: true, runValidators: true }
    ).populate("userId", "fullName email phoneNumber avatar");
  }

  // Update Table status if provided
  if (tableStatus && reservation.tableId) {
    updatedTable = await Table.findByIdAndUpdate(
      reservation.tableId,
      { tableStatus: tableStatus },
      { new: true, runValidators: true }
    );
  }

  // Fetch the final reservation with populated data
  const finalReservation = await Reservation.findById(reservationId)
    .populate("userId", "fullName email phoneNumber avatar")
    .populate("tableId");

  return res.status(200).json(
    new ApiResponse(200, {
      reservation: finalReservation,
      table: updatedTable
    }, "Updated successfully")
  );
});

// ===================== USER RESERVATIONS =====================
const getUserReservations = asyncHandler(async (req, res) => {
  const reservations = await Reservation.find({
    userId: req.user?._id,
  })
    .populate("userId", "fullName email phoneNumber avatar")
    .populate("tableId")
    .sort({ createdAt: -1 }); // Using createdAt since Reservation doesn't have date/startTimeInMinutes

  console.log("reservations", reservations);

  // Transform data to include table details
  const formattedReservations = reservations.map(reservation => ({
    ...reservation.toObject(),
    tableDetails: reservation.tableId,
    reservationDate: reservation.tableId?.date,
    startTime: reservation.tableId?.startTime,
    endTime: reservation.tableId?.endTime,
    numberOfGuests: reservation.tableId?.numberOfGuest,
    status: reservation.tableId?.tableStatus
  }));

  console.log("formattedReservations",reservations)

  return res.status(200).json(
    new ApiResponse(200, reservations, "User reservations fetched successfully")
  );
});

// ===================== ALL RESERVATIONS =====================
const getAllReservations = asyncHandler(async (req, res) => {
  const reservations = await Reservation.find()
    .populate("userId", "fullName email phoneNumber")
    .populate("tableId")
    .sort({ createdAt: -1 });

  // Transform data to include table details
  const formattedReservations = reservations.map(reservation => ({
    ...reservation.toObject(),
    tableDetails: reservation.tableId,
    reservationDate: reservation.tableId?.date,
    startTime: reservation.tableId?.startTime,
    endTime: reservation.tableId?.endTime,
    numberOfGuests: reservation.tableId?.numberOfGuest,
    status: reservation.tableId?.tableStatus
  }));

  return res.status(200).json(
    new ApiResponse(200, reservations, "All reservations fetched successfully")
  );
});

// ===================== SUMMARY =====================
const getReservationSummary = asyncHandler(async (req, res) => {
  // Get summary from Table collection since status is stored there
  const result = await Table.aggregate([
    {
      $group: {
        _id: "$tableStatus",
        count: { $sum: 1 },
      },
    },
  ]);

  const summary = {
    pending: 0,
    confirmed: 0,
    completed: 0,
    cancelled: 0,
  };

  result.forEach((r) => {
    const statusKey = r._id?.toLowerCase();
    if (summary.hasOwnProperty(statusKey)) {
      summary[statusKey] = r.count;
    }
  });

  // Also get reservation count
  const totalReservations = await Reservation.countDocuments();

  return res.status(200).json(
    new ApiResponse(200, {
      tableStatusSummary: summary,
      totalReservations: totalReservations
    }, "Summary fetched successfully")
  );
});

// ===================== GET RESERVATION BY ID =====================
const getReservationById = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const reservation = await Reservation.findById(id)
    .populate("userId", "fullName email phoneNumber avatar")
    .populate("tableId");

  if (!reservation) {
    throw new ApiError(404, "Reservation not found");
  }

  return res.status(200).json(
    new ApiResponse(200, reservation, "Reservation fetched successfully")
  );
});

// ===================== CANCEL RESERVATION =====================
const cancelReservation = asyncHandler(async (req, res) => {
  const { reservationId } = req.params;

  const reservation = await Reservation.findById(reservationId);
  if (!reservation) {
    throw new ApiError(404, "Reservation not found");
  }

  // Update table status to cancelled
  const updatedTable = await Table.findByIdAndUpdate(
    reservation.tableId,
    { tableStatus: tableReservationStatus.CANCELLED },
    { new: true }
  );

  if (!updatedTable) {
    throw new ApiError(404, "Table reservation not found");
  }

  return res.status(200).json(
    new ApiResponse(200, {
      reservation: reservation,
      table: updatedTable
    }, "Reservation cancelled successfully")
  );
});

export {
  newTableReservation,
  availableTableForReservation,
  updateReservationStatus,
  getUserReservations,
  getAllReservations,
  getReservationSummary,
  getReservationById,
  cancelReservation,
};
