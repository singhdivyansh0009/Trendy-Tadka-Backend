import dotenv from "dotenv";
import connectDB from "./db/db.js";
import app from "./app.js";
dotenv.config(); // configuring dotenv varibales
connectDB()  // connecting the database
.then(() => {
    // Listening the server on port
    const PORT =  process.env.PORT || 3000;
    app.listen(PORT, () =>{
        console.log("Server started on PORT", PORT);
    })
})
.catch((err)=>{
     console.log("DB connection failed : ", err);
}); 