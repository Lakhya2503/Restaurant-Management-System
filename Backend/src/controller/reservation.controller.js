import asyncHandler from "../utils/asyncHandler.js";
import ApiResponse from "../utils/ApiResponse.js";
import ApiError from "../utils/ApiError.js";
import Reservation from "../models/reservation.models.js";

// Table capacity mapping
const tableMapping = {
  1: { start: 1, end: 5 },
  2: { start: 6, end: 20 },
  3: { start: 21, end: 35 },
  4: { start: 36, end: 50 },
  5: { start: 51, end: 65 },
  6: { start: 66, end: 80 },
  7: { start: 81, end: 95 },
  8: { start: 96, end: 110 },
  10: { start: 111, end: 125 },
  12: { start: 126, end: 140 }
};

// Validate HH:mm format
const validateTimeFormat = (time) =>
  /^([01]\d|2[0-3]):([0-5]\d)$/.test(time);

// Convert time → minutes
const toMinutes = (time) => {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
};

// Get table range based on guests (flexible)
const getTableRange = (guests) => {
  const capacity = Object.keys(tableMapping)
    .map(Number)
    .sort((a, b) => a - b)
    .find(c => guests <= c);

  return capacity ? tableMapping[capacity] : null;
};

// Get all tables in range
const getPossibleTables = (range) =>
  Array.from(
    { length: range.end - range.start + 1 },
    (_, i) => range.start + i
  );

// Find free tables
const findFreeTables = async (tables, date, startMin, endMin) => {
  const reserved = await Reservation.find({
    tableNo: { $in: tables },
    date,
    startTimeInMinutes: { $lt: endMin },
    endTimeInMinutes: { $gt: startMin }
  }).select("tableNo");

  const reservedSet = new Set(reserved.map(r => r.tableNo));

  return tables.filter(t => !reservedSet.has(t));
};

// Create reservation
const newTableReservation = asyncHandler(async (req, res) => {
  let {
    tableNo,
    startTime,
    endTime,
    date,
    noOfGuests,
    name,
    specialRequests,
    phoneNumber,
    reservationUserEmail
  } = req.body;

  // Validation
  if (!startTime || !endTime || !date || !noOfGuests) {
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
  if (isNaN(parsedDate)) {
    throw new ApiError(400, "Invalid date format (YYYY-MM-DD)");
  }

  const range = getTableRange(noOfGuests);
  if (!range) {
    throw new ApiError(400, "Invalid guest count");
  }

  const possibleTables = getPossibleTables(range);

  // Validate table if provided
  if (tableNo && !possibleTables.includes(tableNo)) {
    throw new ApiError(400, "Invalid table for given guest count");
  }

  // Auto assign table
  if (!tableNo) {
    const freeTables = await findFreeTables(
      possibleTables,
      parsedDate,
      startMin,
      endMin
    );

    if (!freeTables.length) {
      throw new ApiError(400, "No tables available");
    }

    tableNo = freeTables[0];
  }

  // Conflict check
  const conflict = await Reservation.findOne({
    tableNo,
    date: parsedDate,
    startTimeInMinutes: { $lt: endMin },
    endTimeInMinutes: { $gt: startMin }
  });

  if (conflict) {
    throw new ApiError(400, "Table already booked");
  }

  const reservation = await Reservation.create({
    tableNo,
    startTime,
    endTime,
    startTimeInMinutes: startMin,
    endTimeInMinutes: endMin,
    date: parsedDate,
    noOfGuests,
    name,
    reservationUserId : req.user?._id ,
    reservationUserEmail,
    phoneNumber,
    specialRequests
  });

  return res.status(201).json(
    new ApiResponse(201, reservation, "Table reserved successfully")
  );
});

// Get available tables
const availableTableForReservation = asyncHandler(async (req, res) => {
  const { noOfGuests, date, startTime, endTime } = req.query;

  if (!noOfGuests || !date || !startTime || !endTime) {
    throw new ApiError(400, "Missing query params");
  }

  if (!validateTimeFormat(startTime) || !validateTimeFormat(endTime)) {
    throw new ApiError(400, "Invalid time format");
  }

  const startMin = toMinutes(startTime);
  const endMin = toMinutes(endTime);

  if (startMin >= endMin) {
    throw new ApiError(400, "End time must be after start time");
  }

  const parsedDate = new Date(date);
  if (isNaN(parsedDate)) {
    throw new ApiError(400, "Invalid date format");
  }

  const range = getTableRange(Number(noOfGuests));
  if (!range) {
    throw new ApiError(400, "Invalid guest count");
  }

  const possibleTables = getPossibleTables(range);

  const freeTables = await findFreeTables(
    possibleTables,
    parsedDate,
    startMin,
    endMin
  );

  return res.status(200).json(
    new ApiResponse(200, { freeTables }, "Available tables fetched")
  );
});

// Update reservation status
const updateReservationStatus = asyncHandler(async (req, res) => {
  const { tableReservationId } = req.params;
  const { tableReservationStatus, tableNo } = req.body;

  if (!tableReservationStatus) {
    throw new ApiError(400, "Status required");
  }

  const reservation = await Reservation.findById(tableReservationId);
  if (!reservation) {
    throw new ApiError(404, "Reservation not found");
  }

  const updated = await Reservation.findByIdAndUpdate(
    tableReservationId,
    {
      tableReservationStatus,
      ...(tableNo && { tableNo })
    },
    { new: true, runValidators: true }
  ).populate("reservationUserId", "fullName email phoneNumber");

  return res.status(200).json(
    new ApiResponse(200, updated, "Reservation updated")
  );
});

// User reservations
const getUserReservations = asyncHandler(async (req, res) => {

          const reservations = await Reservation.find({
          reservationUserId: req.user?._id
        })
        .populate({
          path: "reservationUserId",
          select: "fullName email phoneNumber avatar"
        })
        .sort({ date: -1, startTimeInMinutes: -1 });

  return res.status(200).json(
    new ApiResponse(200, reservations, "User reservations fetched")
  );
});


const getAllReservations = asyncHandler(async (req, res) => {
  const reservations = await Reservation.find()
    .populate("reservationUserId", "fullName email phoneNumber")
    .sort({ date: -1, startTimeInMinutes: -1 });

  return res.status(200).json(
    new ApiResponse(200, reservations, "All reservations fetched")
  );
});

// Summary
const getReservationSummary = asyncHandler(async (req, res) => {
  const summary = await Reservation.aggregate([
    {
      $group: {
        _id: "$tableReservationStatus",
        count: { $sum: 1 }
      }
    }
  ]);

  const formatted = {
    Pending: 0,
    Confirm: 0,
    Completed: 0,
    Cancelled: 0
  };

  summary.forEach(item => {
    if (item._id) {
      formatted[item._id] = item.count;
    }
  });

  return res.status(200).json(
    new ApiResponse(200, formatted, "Summary fetched")
  );
});

export {
  newTableReservation,
  availableTableForReservation,
  updateReservationStatus,
  getUserReservations,
  getAllReservations,
  getReservationSummary
};
