import asyncHandler from "../utils/asyncHandler.js";
import ApiResponse from "../utils/ApiResponse.js";
import ApiError from "../utils/ApiError.js";
import Reservation from "../models/reservation.models.js";
import {
  buildConflictQuery,
  validateTimeFormat,
  toMinutes,
  getTableRange,
  getPossibleTables} from "../utils/helper.js";

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
  } = req.body;

  if (!startTime || !endTime || !date || !noOfGuests || !name || !phoneNumber) {
    throw new ApiError(400, "Missing required fields");
  }

  if (!validateTimeFormat(startTime) || !validateTimeFormat(endTime)) {
    throw new ApiError(400, "Invalid time format (HH:mm)");
  }

  const startMin = toMinutes(startTime);
  const endMin = toMinutes(endTime);

  if (startMin >= endMin) {
    throw new ApiError(400, "End time must be after start time");
  }

  const parsedDate = new Date(date);
  if (isNaN(parsedDate.getTime())) {
    throw new ApiError(400, "Invalid date format");
  }

  const range = getTableRange(Number(noOfGuests));
  if (!range) throw new ApiError(400, "Invalid guest count");

  const possibleTables = getPossibleTables(range);

  let finalTable = Number(tableNo);

  if (finalTable && !possibleTables.includes(finalTable)) {
    throw new ApiError(400, "Invalid table selection");
  }

  // AUTO ASSIGN
  if (!finalTable) {
    const booked = await Reservation.find({
      tableNo: { $in: possibleTables },
      date: parsedDate,
      tableReservationStatus: { $ne: "cancelled" },
      startTimeInMinutes: { $lt: endMin },
      endTimeInMinutes: { $gt: startMin },
    }).select("tableNo");

    const bookedSet = new Set(booked.map((b) => b.tableNo));
    const freeTables = possibleTables.filter((t) => !bookedSet.has(t));

    if (!freeTables.length) {
      throw new ApiError(400, "No tables available");
    }

    finalTable = freeTables[0];
  }

  // CONFLICT CHECK
  const conflict = await Reservation.findOne(
    buildConflictQuery(finalTable, parsedDate, startMin, endMin)
  );

  if (conflict) {
    throw new ApiError(400, "Table already booked for this time slot");
  }

  // CREATE
  const reservation = await Reservation.create({
    tableNo: finalTable,
    startTime,
    endTime,
    startTimeInMinutes: startMin,
    endTimeInMinutes: endMin,
    date: parsedDate,
    noOfGuests: Number(noOfGuests),
    name,
    phoneNumber,
    reservationEmail: req.user?.email, // safe now
    reservationUserId: req.user?._id,
    specialRequests,
  });

  return res.status(201).json(
    new ApiResponse(201, reservation, "Reservation created successfully")
  );
});

// ===================== AVAILABLE TABLES =====================
const availableTableForReservation = asyncHandler(async (req, res) => {
    const { noOfGuests, date, startTime, endTime } = req.body;
    console.log(req.body)

    if (startTime === endTime) {
        console.log(req.body)
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
        // const endMin = toMinutes(endTime);
        console.log("startMin", startMin)
        const booked = await Reservation.find({
            tableNo: { $in: possibleTables },
            date: { $gte: startOfDay, $lte: endOfDay },
            tableReservationStatus: { $ne: "cancelled" },
            startTimeInMinutes: { $lte: startMin },
            endTimeInMinutes: { $gt: startMin },
        }).select("tableNo");
        console.log("booked", booked)
        const bookedSet = new Set(booked.map((b) => b.tableNo));
        console.log("bookedSet", bookedSet)
        const freeTables = possibleTables.filter((t) => !bookedSet.has(t));
        console.log("freeTables", freeTables)
        return res.status(200).json(
            new ApiResponse(200, { freeTables }, "Available tables fetched")
        );
    }

    if (!noOfGuests || !date || !startTime || !endTime) {
        throw new ApiError(400, "Missing required fields");
    }

    if (!validateTimeFormat(startTime) || !validateTimeFormat(endTime)) {
        throw new ApiError(400, "Invalid time format");
    }

    const startMin = toMinutes(startTime);
    const endMin = toMinutes(endTime);
    const parsedDate = new Date(date);
    const range = getTableRange(Number(noOfGuests));

    if (!range) throw new ApiError(400, "Invalid guest count");

    const possibleTables = getPossibleTables(range);
    const startOfDay = new Date(parsedDate);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(parsedDate);
    endOfDay.setHours(23, 59, 59, 999);

    // CASE 1: If start == end → treat as instant lookup (NO range logic)
    if (startMin === endMin) {
        const booked = await Reservation.find({
            tableNo: { $in: possibleTables },
            date: { $gte: startOfDay, $lte: endOfDay },
            tableReservationStatus: { $ne: "cancelled" },
            startTimeInMinutes: { $lte: startMin },
            endTimeInMinutes: { $gt: startMin },
        }).select("tableNo");

        const bookedSet = new Set(booked.map((b) => b.tableNo));
        const freeTables = possibleTables.filter((t) => !bookedSet.has(t));

        return res.status(200).json(
            new ApiResponse(200,  freeTables , "Available tables fetched")
        );
    }

    // CASE 2: normal validation (only when they are different)
    if (startMin > endMin) {
        throw new ApiError(400, "Invalid time range");
    }

    // CASE 3: normal overlap check
    const booked = await Reservation.find({
        tableNo: { $in: possibleTables },
        date: { $gte: startOfDay, $lte: endOfDay },
        tableReservationStatus: { $ne: "cancelled" },
        startTimeInMinutes: { $lt: endMin },
        endTimeInMinutes: { $gt: startMin },
    }).select("tableNo");

    const bookedSet = new Set(booked.map((b) => b.tableNo));
    const freeTables = possibleTables.filter((t) => !bookedSet.has(t));

    return res.status(200).json(
        new ApiResponse(200, { freeTables }, "Available tables fetched")
    );
});
// ===================== UPDATE STATUS =====================
const updateReservationStatus = asyncHandler(async (req, res) => {
  const { tableReservationId } = req.params;
  const { tableReservationStatus, tableNo } = req.body;

  if (!tableReservationStatus) {
    throw new ApiError(400, "Status required");
  }

  const updated = await Reservation.findByIdAndUpdate(
    tableReservationId,
    {
      tableReservationStatus,
      ...(tableNo && { tableNo: Number(tableNo) }),
    },
    { new: true, runValidators: true }
  ).populate("reservationUserId", "fullName email phoneNumber avatar");

  if (!updated) {
    throw new ApiError(404, "Reservation not found");
  }

  return res.status(200).json(
    new ApiResponse(200, updated, "Updated successfully")
  );
});

// ===================== USER RESERVATIONS =====================
const getUserReservations = asyncHandler(async (req, res) => {
  const data = await Reservation.find({
    reservationUserId: req.user?._id,
  })
    .populate("reservationUserId", "fullName email phoneNumber avatar")
    .sort({ date: -1, startTimeInMinutes: -1 });

  return res.status(200).json(
    new ApiResponse(200, data, "User reservations")
  );
});

// ===================== ALL RESERVATIONS =====================
const getAllReservations = asyncHandler(async (req, res) => {
  const data = await Reservation.find()
    .populate("reservationUserId", "fullName email phoneNumber")
    .sort({ date: -1, startTimeInMinutes: -1 });

  return res.status(200).json(
    new ApiResponse(200, data, "All reservations")
  );
});

// ===================== SUMMARY =====================
const getReservationSummary = asyncHandler(async (req, res) => {
  const result = await Reservation.aggregate([
    {
      $group: {
        _id: "$tableReservationStatus",
        count: { $sum: 1 },
      },
    },
  ]);

  const summary = {
    Pending: 0,
    Confirm: 0,
    Completed: 0,
    Cancelled: 0,
  };

  result.forEach((r) => {
    summary[r._id] = r.count;
  });

  return res.status(200).json(
    new ApiResponse(200, summary, "Summary fetched")
  );
});

export {
  newTableReservation,
  availableTableForReservation,
  updateReservationStatus,
  getUserReservations,
  getAllReservations,
  getReservationSummary,
};
