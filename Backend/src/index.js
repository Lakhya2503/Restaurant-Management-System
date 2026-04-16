import app from './app.js'
import connectDB from './db/index.js'
import { port as PORT } from './utils/config.js';


const port = PORT || 5002

connectDB()
  .then(()=>{
      app.listen(port, () => {
          console.log(`⚙️  Server runing on ${port} `)
      })
  })
    .catch((error) =>{
        console.log(`${error.message}`)
  })
