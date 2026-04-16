import { Router } from 'express'
import { allOrders,
  cancelledHomeDeliveryOrder,
  createHomeDeliveryOrder,
  createTableOrder,
  deleteTableOrder,
  orderStatusUpdate,
  tableOrderUpdate,
  userOrders } from '../controller/order.controller.js'
import { verifyAdmin, verifyJWT } from '../middleware/auth.middelware.js'
import { homeDeliveryOrderValidator, tableOrderValidator } from '../validator/order.validator.js'
import { validate } from '../validator/validate.js'


const router = Router()

router.use(verifyJWT)

router.route("/add/table-order").post(tableOrderValidator(), validate, createTableOrder)

router.route("/add/home-delivery-order").post(homeDeliveryOrderValidator(), validate, createHomeDeliveryOrder)

router.route("/update/table-order/:orderId").post(tableOrderUpdate)

// admin
router.route("/update/status-order/:orderId").post(verifyAdmin, orderStatusUpdate)

router.route("/delete/table-order/:orderId").delete(deleteTableOrder)

router.route("/all-orders").get(verifyAdmin, allOrders)

// user orders
router.route("/order-users").get(userOrders)

router.route("/cancelled-order/:orderId").post(cancelledHomeDeliveryOrder)


export default router
