import Order from "../models/order.models.js";
import ApiError from "../utils/ApiError.js";
import ApiResponse from "../utils/ApiResponse.js";
import asyncHandler from "../utils/asyncHandler.js";
import { OrderStatusEnums, orderType } from "../utils/constants.js";
import { requiredField } from '../utils/helper.js';
import mongoose  from "mongoose";
import Menu from '../models/menu.models.js';

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
  const { tableNo, specialNotes, items } = req.body;

  if (!tableNo) {
    throw new ApiError(400, "Table number is required");
  }

  validateItems(items);
  const menuItems = await checkItemsExist(items);

  const totalAmount = items.reduce((total, item) => {
    const menuItem = menuItems.find((m) => String(m._id) === String(item.itemId));
    return total + (menuItem?.priceOfItem ?? 0) * item.quantity;
  }, 0);

  const order = await Order.create({
    orderType: orderType.TABLEORDER,
    userId: req.user._id,
    tableNo,
    specialNotes,
    items,
    activeOrder: false,
    totalAmount
  });

  return res.status(201).json(
    new ApiResponse(201, order, "Table order created successfully")
  );
});

// admin
const orderStatusUpdate = asyncHandler(async (req, res) => {
  const { status, cancellationReason } = req.body;
  const { orderId } = req.params;

  requiredField([status]);

  if (!OrderStatusEnums.includes(status)) {
    throw new ApiError(400, "Please provide a valid status");
  }

  const order = await Order.findByIdAndUpdate(
    orderId,
    {
      orderStatus: status,
      ...(cancellationReason && { cancellationReason })
    },
    {
      new: true,
      runValidators: true,
    }
  );

  if (!order) {
    throw new ApiError(404, "Order not found");
  }

  return res.status(200).json(
    new ApiResponse(200, order, "Order updated successfully")
  );
});

const tableOrderUpdate = asyncHandler(async(req,res) => {

    const { orderId } = req.params

    const { items, specialNotes, tableNo } = req.body

    const order = await Order.findById(orderId)

    if(!order) {
      throw new ApiError(400, "Order can't find")
    }
      requiredField(items);

    if (!Array.isArray(items) || items.length === 0) {
      throw new ApiError(400, "Items must be a non-empty array");
    }

    items.forEach((item) => {
      if (!item.itemId || !item.quantity) {
        throw new ApiError(400, "Each item must have itemId and quantity");
      }

      if (item.quantity <= 0) {
        throw new ApiError(400, "Quantity must be greater than 0");
      }

    })

    const updateData = {}


    if(order.userId === req.user?._id) {
      throw new ApiError(401, "You can't update the Table order")
    }




    if(order.orderType !== orderType.TABLEORDER ) {
      throw new ApiResponse(400, "This is not Table order")
    }

    if (items) {
    if (!Array.isArray(items) || items.length === 0) {
      throw new ApiError(400, "Items must be a non-empty array");
    }
    updateData.items = items;
  }

  if (tableNo) {
    if (tableNo <= 0) {
      throw new ApiError(400, "Invalid table number");
    }
    updateData.tableNo = tableNo;
  }

  if (specialNotes !== undefined) {
    updateData.specialNotes = specialNotes;
  }

  const updatedOrder = await Order.findByIdAndUpdate(
    order?._id,
    { $set: updateData },
    { new: true }
  );


    return res.status(200).json(new ApiResponse(200,  { updatedOrder }  , "table order update"))
})

const deleteTableOrder = asyncHandler(async(req,res)=>{

    const { orderId } = req.params

    const order = await Order.findById(orderId)

     if(order.orderType !== orderType.TABLEORDER ) {
      throw new ApiResponse(400, "This is not Table order")
    }

    if(order.userId !== req.user?._id) {
      throw new ApiError(401, "You can't Delete the Table order")
    }

    await Order.findByIdAndDelete(order?._id)

  return res.status(200).json(new ApiResponse(200, {}, "Table order delete successfully"))
});

const cancelledHomeDeliveryOrder = asyncHandler(async(req,res)=>{
  const { orderId } = req.params;
  const { cancellationReason } = req.body;

   await Order.findByIdAndUpdate(orderId, {
    $set : {
        orderStatus : 'Cancelled',
        ...(cancellationReason && { cancellationReason })
    }
   },  { new: true })

    return res.status(200).json(new ApiResponse(200, {}, "Home delivery order cancelled successfully"))
})

const allOrders = asyncHandler(async (req, res) => {
  const orders = await Order.find()
    .populate("userId", "name email fullName")
    .populate("items.itemId", "itemName priceOfItem itemImage")
    .populate("paymentId")
    .sort({ createdAt: -1 });

  return res
    .status(200)
    .json(new ApiResponse(200, { orders }, "All orders fetched successfully"));
});

// user
const userOrders = asyncHandler(async (req, res) => {
  const userId = req.user._id;

  const orders = await Order.find({ userId })
    .populate("items.itemId", "itemName priceOfItem itemImage")
    .populate("userId" , "fullName")
    .populate("paymentId")
    .sort({ createdAt: -1 });

  return res.status(200).json(
    new ApiResponse(200, { orders }, "User orders fetched successfully")
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
  cancelledHomeDeliveryOrder
}
