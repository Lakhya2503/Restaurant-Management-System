import Router from 'express'

import { verifyJWT } from '../middleware/auth.middelware.js'
import newPayment from '../controller/payment.controller.js'


const router = Router()

router.route("/new-payment/:orderId").post(verifyJWT, newPayment)


export default router
