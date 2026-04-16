# Routes
## Testing Routes

- Data for testing routes

## Data for Register User

```js
{
    "fullName": "FirstName Lastname",
    "email": "exampleEmail@gmail.com",
    "password" : "Password@1234",
    "adminSuperKey" : "Admin@Res#2026",
    "phoneNumber" : 8923456174,
    "address" : [
        {
            "add" : "Stree1 colony 2 nums",
            "place" : "Home",
            "currentAddSelected" : false,
            "pinCode" : 250645
        },
        {
            "add" : "Stree1 colony 1 Dumbule",
            "place" : "Work",
            "pinCode" : 6458785,
            "currentAddSelected" : true
        }
    ]
}
```

## Route for Register User

```
http://localhost:5000/restaurant/api/v1/auth/user/register

```


## Data for Login User

```js
{
    "email": "exampleEmail@gmail.com",
    "password" : "Password@1234",
}
```

## Route for Login User

```
http://localhost:5000/restaurant/api/v1/auth/user/login

```


## Route for Logout User
- Note : For logout wan't only routes no data
```
http://localhost:5000/restaurant/api/v1/auth/user/logout

```


## Route for Add new menu item

```
http://localhost:5000/restaurant/api/v1/menu/create/new-item
```
## Data for add menu item

```js
{
    "itemName": "Biryani of Mughal",
    "itemDescription": "This biryani of time from mughal's was eating this",
    "itemImage": "https://i.pinimg.com/736x/0f/0c/04/0f0c04461875fcf40f1df2d279aafe89.jpg",
    "priceOfItem": 254,
    "itemCategory": "Biryani"
}

```


## Route for Add new order based on typeOfOrder

```
http://localhost:5000/restaurant/api/v1/order/add/new-order
```
## Data for order based on typeOfOrder

// note : this is for home delivery
```js
{
    "typeOfOrder": "Home Delivery",
    "items" : [
        {
            "itemId" : "69dd59507cf5cdcce4bcc281",
            "quantity" : 1
        }
    ] ,
    "address" : "Stree1 colony 2 nums "
}

```

#--------------------------------------------------------------------------------

```
http://localhost:5000/restaurant/api/v1/order/add/new-order
```
## Data for order based on typeOfOrder

// note : this is for Table Order
```js
{
    "typeOfOrder": "Table Order",
    "tableNo" : "3",
    "specialNotes" : "don't be spacy a fodd",
    "items" : [
        {
            "itemId" : "69dd59507cf5cdcce4bcc281",
            "quantity" : 1
        }
    ]
}

```
