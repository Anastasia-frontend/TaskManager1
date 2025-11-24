require('dotenv').config();
const express = require('express');
const cors = require('cors');           
const app = express();
const { stages, tasks } = require('./routes');
const initializeStorage = require('./db/storage');
const notFound = require('./middleware/not-found');
const errorHandler = require('./middleware/error-handler');


app.use(express.static('./public'));
app.use(express.json());
app.use(cors());                      


app.use('/api/v1/tasks', tasks);
app.use('/api/v1/stages', stages);


app.use(notFound);
app.use(errorHandler);

// Изменен порт с 5000 на 3000 согласно заданию и Postman коллекции
const port = process.env.PORT || 3000;

const start = async () => {
  try {
    await initializeStorage();
    app.listen(port, () =>
      console.log(`Server is listening on port ${port}...`)
    );
  } catch (error) {
    console.log(error);
  }
};

start();