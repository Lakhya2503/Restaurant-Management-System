import { Router } from 'express'
import {
  availableTableForReservation,
  newTableReservation,
  getUserReservations,
  getAllReservations,
  getReservationSummary,
  updateReservationStatus
} from '../controller/reservation.controller.js'
import { verifyAdmin, verifyJWT } from '../middleware/auth.middelware.js'

const router = Router()

router.use(verifyJWT)

router.route("/new-reserve").post( newTableReservation)

router.route("/update-reservation/:tableReservationId").post(verifyAdmin, updateReservationStatus)


router.route("/available-table").get(availableTableForReservation)
router.route("/get-user-reservations").get(getUserReservations)
router.route("/get-all-reservations").get(verifyAdmin, getAllReservations)
router.route("/get-summary").get(verifyAdmin, getReservationSummary)

export default router
