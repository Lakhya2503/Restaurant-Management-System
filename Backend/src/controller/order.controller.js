import Order from "../models/order.models.js";
import ApiError from "../utils/ApiError.js";
import ApiResponse from "../utils/ApiResponse.js";
import asyncHandler from "../utils/asyncHandler.js";
import { OrderStatusEnums, orderType } from "../utils/constants.js";
import { requiredField, toMinutes } from '../utils/helper.js';
import mongoose from "mongoose";
import Menu from '../models/menu.models.js';
import Table from "../models/table.models.js";

const validateItems = (items) => {
  if (!Array.isArray(items) || items.length === 0) {
    throw new ApiError(400, "Items must be a non-empty array");
  }

  for (const item of items) {
    if (!item.itemId || item.quantity == null) {
      throw new ApiError(400, "Each item must have itemId and quantity");
    }

    if (item.quantity <= 0) {
      throw new ApiError(400, "Quantity must be greater than 0");
    }

    if (!mongoose.Types.ObjectId.isValid(item.itemId)) {
      throw new ApiError(400, `Invalid itemId: ${item.itemId}`);
    }
  }
};

const checkItemsExist = async (items) => {
  const itemIds = items.map(i => i.itemId);
  const menuItems = await Menu.find({ _id: { $in: itemIds } });

  if (menuItems.length !== itemIds.length) {
    throw new ApiError(400, "Some items do not exist");
  }

  return menuItems;
};

const createHomeDeliveryOrder = asyncHandler(async (req, res) => {
  const { address, items } = req.body;

  if (!address) {
    throw new ApiError(400, "Address is required");
  }

  validateItems(items);
  const menuItems = await checkItemsExist(items);

  const totalAmount = items.reduce((total, item) => {
    const menuItem = menuItems.find((m) => String(m._id) === String(item.itemId));
    return total + (menuItem?.priceOfItem ?? 0) * item.quantity;
  }, 0);

  const order = await Order.create({
    orderType: orderType.HOMEDELIVERY,
    userId: req.user._id,
    address,
    items,
    activeOrder: false,
    totalAmount
  });

  return res.status(201).json(
    new ApiResponse(201, order, "Home delivery order created successfully")
  );
});

const createTableOrder = asyncHandler(async (req, res) => {
  console.log("req.body = ", req.body);

  const {
    noOfGuest,
    typeOfOrder,
    tableNo,
    items,
    date,
    startTime,
    endTime,
    specialNotes
  } = req.body;

  // Validate required fields
  if (!tableNo) {
    throw new ApiError(400, "Table number is required");
  }

  if (!items || items.length === 0) {
    throw new ApiError(400, "At least one item is required");
  }

  if (!date || !startTime || !endTime) {
    throw new ApiError(400, "Date, start time and end time are required for table order");
  }

  // Convert times
  const startMin = toMinutes(startTime);
  const endMin = toMinutes(endTime);
  const parsedDate = new Date(date);

  // Validate time
  if (startMin >= endMin) {
    throw new ApiError(400, "End time must be after start time");
  }

  // Check if table is already booked
  const existingBooking = await Table.findOne({
    tableNumber: Number(tableNo),
    date: parsedDate,
    tableStatus: { $ne: "cancelled" },
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

  // Check menu items and calculate total
  const menuItems = await checkItemsExist(items);
  const totalAmount = items.reduce((total, item) => {
    const menuItem = menuItems.find((m) => String(m._id) === String(item.itemId));
    return total + (menuItem?.priceOfItem ?? 0) * item.quantity;
  }, 0);

  // Create table reservation with proper status
  const tableReservation = {
    tableNumber: Number(tableNo),
    startTime: startTime,
    startTimeInMinutes: startMin,
    numberOfGuest: noOfGuest || 1,
    endTime: endTime,
    endTimeInMinutes: endMin,
    date: parsedDate,
    tableStatus: "pending" // Add status for tracking
  };

  console.log("Table reservation data:", tableReservation);
  const tableCreated = await Table.create(tableReservation);
  console.log("Table created:", tableCreated._id);

  // Create order with proper fields
  const tableOrderCreation = {
    items: items,
    orderType: typeOfOrder || orderType.TABLEORDER,
    userId: req.user._id,
    tableId: tableCreated._id,
    orderStatus: orderStatus.PENDING,
    activeOrder: true,
    specialNotes: specialNotes || "",
    totalAmount: totalAmount,
  };

  console.log("Order data being sent:", JSON.stringify(tableOrderCreation, null, 2));

  let tableOrderCreated;
  try {
    tableOrderCreated = await Order.create(tableOrderCreation);
    console.log("Order created successfully:", tableOrderCreated._id);
  } catch (error) {
    console.error("Order creation failed!");
    console.error("Error message:", error.message);

    // Delete the table since order creation failed
    await Table.findByIdAndDelete(tableCreated._id);
    console.log("Rolled back - deleted table:", tableCreated._id);

    throw new ApiError(400, `Order creation failed: ${error.message}`);
  }

  return res.status(201).json(
    new ApiResponse(201, tableOrderCreated, "Table order created successfully")
  );
});

// Admin: Update order status
const orderStatusUpdate = asyncHandler(async (req, res) => {
  const { status, cancellationReason } = req.body;
  const { orderId } = req.params;

  requiredField([status]);

  if (!OrderStatusEnums.includes(status)) {
    throw new ApiError(400, "Please provide a valid status");
  }

  const order = await Order.findById(orderId);

  if (!order) {
    throw new ApiError(404, "Order not found");
  }

  // If order is being cancelled and has a tableId, update table status
  if (status === "Cancelled" && order.tableId) {
    await Table.findByIdAndUpdate(order.tableId, {
      tableStatus: "cancelled"
    });
  }

  // If order is being completed, update table status
  if (status === "Completed" && order.tableId) {
    await Table.findByIdAndUpdate(order.tableId, {
      tableStatus: "completed"
    });
  }

  const updatedOrder = await Order.findByIdAndUpdate(
    orderId,
    {
      orderStatus: status,
      ...(cancellationReason && { cancellationReason }),
      ...(status === "Completed" && { activeOrder: false }),
      ...(status === "Cancelled" && { activeOrder: false })
    },
    {
      new: true,
      runValidators: true,
    }
  );

  return res.status(200).json(
    new ApiResponse(200, updatedOrder, "Order updated successfully")
  );
});

// Update table order (Admin only)
const tableOrderUpdate = asyncHandler(async (req, res) => {
  const { orderId } = req.params;
  const { items, specialNotes, tableNo } = req.body;

  const order = await Order.findById(orderId);

  if (!order) {
    throw new ApiError(404, "Order not found");
  }

  // Check if user is admin (you can add admin check logic here)
  if (String(order.userId) === String(req.user?._id)) {
    throw new ApiError(403, "You can't update your own table order");
  }

  if (order.orderType !== orderType.TABLEORDER) {
    throw new ApiError(400, "This is not a table order");
  }

  const updateData = {};

  if (items) {
    if (!Array.isArray(items) || items.length === 0) {
      throw new ApiError(400, "Items must be a non-empty array");
    }

    // Validate items
    for (const item of items) {
      if (!item.itemId || !item.quantity) {
        throw new ApiError(400, "Each item must have itemId and quantity");
      }
      if (item.quantity <= 0) {
        throw new ApiError(400, "Quantity must be greater than 0");
      }
    }

    // Recalculate total amount
    const menuItems = await checkItemsExist(items);
    const totalAmount = items.reduce((total, item) => {
      const menuItem = menuItems.find((m) => String(m._id) === String(item.itemId));
      return total + (menuItem?.priceOfItem ?? 0) * item.quantity;
    }, 0);

    updateData.items = items;
    updateData.totalAmount = totalAmount;
  }

  if (tableNo) {
    if (tableNo <= 0) {
      throw new ApiError(400, "Invalid table number");
    }

    // Update table number in the associated Table document
    if (order.tableId) {
      await Table.findByIdAndUpdate(order.tableId, {
        tableNumber: tableNo
      });
    }
  }

  if (specialNotes !== undefined) {
    updateData.specialNotes = specialNotes;
  }

  const updatedOrder = await Order.findByIdAndUpdate(
    order._id,
    { $set: updateData },
    { new: true }
  ).populate("items.itemId", "itemName priceOfItem");

  return res.status(200).json(new ApiResponse(200, { updatedOrder }, "Table order updated successfully"));
});

// Delete table order (User only)
const deleteTableOrder = asyncHandler(async (req, res) => {
  const { orderId } = req.params;

  const order = await Order.findById(orderId);

  if (!order) {
    throw new ApiError(404, "Order not found");
  }

  if (order.orderType !== orderType.TABLEORDER) {
    throw new ApiError(400, "This is not a table order");
  }

  if (String(order.userId) !== String(req.user?._id)) {
    throw new ApiError(403, "You can't delete this table order");
  }

  // Also delete the associated table reservation
  if (order.tableId) {
    await Table.findByIdAndDelete(order.tableId);
  }

  await Order.findByIdAndDelete(order._id);

  return res.status(200).json(new ApiResponse(200, {}, "Table order deleted successfully"));
});

// Cancel home delivery order (User only)
const cancelledHomeDeliveryOrder = asyncHandler(async (req, res) => {
  const { orderId } = req.params;
  const { cancellationReason } = req.body;

  const order = await Order.findById(orderId);

  if (!order) {
    throw new ApiError(404, "Order not found");
  }

  if (order.orderType !== orderType.HOMEDELIVERY) {
    throw new ApiError(400, "This is not a home delivery order");
  }

  if (String(order.userId) !== String(req.user?._id)) {
    throw new ApiError(403, "You can't cancel this order");
  }

  if (order.orderStatus === "Completed") {
    throw new ApiError(400, "Completed orders cannot be cancelled");
  }

  const updatedOrder = await Order.findByIdAndUpdate(orderId, {
    $set: {
      orderStatus: 'Cancelled',
      activeOrder: false,
      ...(cancellationReason && { cancellationReason })
    }
  }, { new: true });

  return res.status(200).json(new ApiResponse(200, updatedOrder, "Home delivery order cancelled successfully"));
});

// Get all orders (Admin only)

const allOrders = asyncHandler(async (req, res) => {
  const orders = await Order.find()
    .populate("userId", "fullName email phoneNumber")
    .populate("items.itemId", "itemName priceOfItem itemImage")
    .populate("paymentId")
    .populate("tableId")
    .sort({ createdAt: -1 });

  return res
    .status(200)
    .json(new ApiResponse(200, { orders }, "All orders fetched successfully"));
});

// Get user orders
const userOrders = asyncHandler(async (req, res) => {
  const userId = req.user._id;

  const orders = await Order.find({ userId })
    .populate("items.itemId", "itemName priceOfItem itemImage")
    .populate("tableId")
    .populate("userId", "fullName email")
    .populate("paymentId")
    .sort({ createdAt: -1 });

  return res.status(200).json(
    new ApiResponse(200, orders, "User orders fetched successfully")
  );
});

// Get single order by ID
const getOrderById = asyncHandler(async (req, res) => {
  const { orderId } = req.params;

  const order = await Order.findById(orderId)
    .populate("userId", "fullName email phoneNumber")
    .populate("items.itemId", "itemName priceOfItem itemImage")
    .populate("tableId")
    .populate("paymentId");

  if (!order) {
    throw new ApiError(404, "Order not found");
  }

  // Check if user has access to this order
  if (String(order.userId._id) !== String(req.user._id) && req.user.role !== "admin") {
    throw new ApiError(403, "You don't have access to this order");
  }

  return res.status(200).json(
    new ApiResponse(200, order, "Order fetched successfully")
  );
});

// Get active table orders
const getActiveTableOrders = asyncHandler(async (req, res) => {
  const activeOrders = await Order.find({
    orderType: orderType.TABLEORDER,
    activeOrder: true,
    orderStatus: { $nin: ["Cancelled", "Completed"] }
  })
    .populate("userId", "fullName email")
    .populate("tableId")
    .populate("items.itemId", "itemName priceOfItem")
    .sort({ createdAt: -1 });

  return res.status(200).json(
    new ApiResponse(200, activeOrders, "Active table orders fetched successfully")
  );
});

export {
  createHomeDeliveryOrder,
  createTableOrder,
  orderStatusUpdate,
  tableOrderUpdate,
  deleteTableOrder,
  allOrders,
  userOrders,
  cancelledHomeDeliveryOrder,
  getOrderById,
  getActiveTableOrders
};
