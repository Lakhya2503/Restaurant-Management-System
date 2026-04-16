
export const userRoleEnums = {
  ADMIN: "admin",
  USER : "user"
}

const AvailbleUserRole = Object.values(userRoleEnums)

export const itemCategory = {
  STARTERS : "Starters",
  MAINCOURSE : "Main Course",
  PIZZAANDPASTA : "Pizza & Pasta",
  DESSERTS : "Desserts",
  SALADS : "Salads",
  BIRYANI : "Biryani"
}

const menuCategoryEnums = Object.values(itemCategory)

export const orderType = {
    HOMEDELIVERY : "Home Delivery",
    TABLEORDER : "Table Order"
}

export const orderTypeEnums = Object.values(orderType)


export const orderStatus = {
  PENDING : "Pending",
  CANCELLED : "Cancelled",
  PREPARING : "Preparing",
  READY : "Ready",
  DELIVERED :  "Delivered",
  SERVED : "Served",
  COMPLETED : "Completed",
  ACTIVE : "active"
}

const OrderStatusEnums = Object.values(orderStatus)

export const userLoginType = {
  GOOGLE : "GOOGLE",
  EMAIL_PASSWORD : "EMAIL_PASSWORD"
}


export const tableReservationStatus = {
  PENDING : "Pending",
  CONFIRM : "Confirm",
  COMPLETED : "Completed",
  CANCELLED : "Cancelled"
}

const tableReservationStatusEnums = Object.values(tableReservationStatus)


const AvailbleSocialLogins = Object.values(userLoginType)

const USER_TEMPORARY_TOKEN = 20 * 60 * 1000


export const paymentType = {
  ONLINE : "Online",
  CASHONDELIVERY : "Cash On Delivery"
}


const paymentTypeEnums = Object.values(paymentType)


export {
  AvailbleUserRole,
  AvailbleSocialLogins,
  USER_TEMPORARY_TOKEN,
  menuCategoryEnums,
  OrderStatusEnums,
  paymentTypeEnums,
  tableReservationStatusEnums
}
