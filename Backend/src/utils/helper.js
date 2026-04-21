import User from '../models/user.models.js';
import ApiError from './ApiError.js';

export const requiredField = (fields = []) => {
    const isAnyFieldMissing = fields.some((field) => {
        if (field === undefined || field === null) return true;
        if (typeof field === "string" && field.trim() === "") return true;
        return false;
    });

    if (isAnyFieldMissing) {
        throw new ApiError(400, "All fields are required");
    }
}

export const removeRefreshTokenAndPassword = async(userId) => {
    await User.findById(userId).select("-password -refreshToken")
}




// ===================== TABLE CONFIG =====================
export const tableMapping = {
  1: { start: 1, end: 5 },
  2: { start: 6, end: 20 },
  3: { start: 21, end: 35 },
  4: { start: 36, end: 50 },
  5: { start: 51, end: 65 },
  6: { start: 66, end: 80 },
  7: { start: 81, end: 95 },
  8: { start: 96, end: 110 },
  9: { start: 111, end: 125 },
  10: { start: 126, end: 140 },
  12: { start: 141, end: 160 },
};


export const validateTimeFormat = (time) =>
  /^([01]\d|2[0-3]):([0-5]\d)$/.test(time);

export const toMinutes = (time) => {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
};

export const getTableRange = (guests) => {
  const key = Object.keys(tableMapping)
    .map(Number)
    .sort((a, b) => a - b)
    .find((k) => guests <= k);

  return key ? tableMapping[key] : null;
};

export const getPossibleTables = (range) =>
  Array.from({ length: range.end - range.start + 1 }, (_, i) => range.start + i);


// reusable conflict query
export const buildConflictQuery = (tableNo, parsedDate, startMin, endMin) => ({
  tableNo,
  date: parsedDate,
  tableReservationStatus: { $ne: "cancelled" },
  startTimeInMinutes: { $lt: endMin },
  endTimeInMinutes: { $gt: startMin },
});

export const DEFAULT_DURATION = 120; // 2 hours

export const getTimeRange = (startTime, endTime) => {
  const startMin = toMinutes(startTime);

  const endMin = endTime
    ? toMinutes(endTime)
    : startMin + DEFAULT_DURATION;

  if (startMin >= endMin) {
    throw new ApiError(400, "Invalid time range");
  }

  return { startMin, endMin };
};

export const isTimeOverlapping = (aStart, aEnd, bStart, bEnd) => {
  return aStart < bEnd && aEnd > bStart;
};
