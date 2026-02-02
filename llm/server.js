require("dotenv").config();
const {app} = require('./src/app');


const port = process.env.PORT || 8003 ;



app.listen(port, () => {
    console.log(`🚀 Server started on port ${port}`);
});








