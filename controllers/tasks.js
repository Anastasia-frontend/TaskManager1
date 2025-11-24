const Task = require('../models/Task');
const Stage = require('../models/Stage');
const asyncWrapper = require('../middleware/asyncWrapper');
const { createCustomError } = require('../errors/custom-error');

const getAllTasks = asyncWrapper(async (req, res) => {
  const filter = {};
  let { stage } = req.query;

  // Фильтрация по строковому имени стадии
  if (typeof stage === 'string') {
    // Если передан ObjectId, находим стадию и получаем её имя
    const stageDoc = await Stage.findById(stage);
    if (stageDoc) {
      filter['stage'] = stageDoc.name;
    } else {
      // Если не найден по ID, проверяем, может это уже имя стадии
      if (['ready', 'progress', 'review', 'done'].includes(stage)) {
        filter['stage'] = stage;
      }
    }
  }

  const tasks = await Task.find(filter);
  res.status(200).json({ tasks });
});

const createTask = asyncWrapper(async (req, res) => {
  // Получаем стадию по умолчанию, если не указана
  let stageName = 'ready'; // значение по умолчанию
  
  if (req.body.stage) {
    // Если передан stage (может быть ObjectId или строка)
    const stageDoc = await Stage.findById(req.body.stage);
    if (stageDoc) {
      stageName = stageDoc.name; // Используем имя стадии
    } else if (['ready', 'progress', 'review', 'done'].includes(req.body.stage)) {
      // Если это уже строка с именем стадии
      stageName = req.body.stage;
    }
  } else {
    // Если стадия не указана, используем стадию по умолчанию
    const defaultStage = await Stage.findOne({default: true});
    if (defaultStage) {
      stageName = defaultStage.name;
    }
  }
  
  let { expiredDate } = req.body;
  if (typeof expiredDate !== 'undefined') {
    expiredDate = new Date(parseInt(expiredDate, 10) + (180 * 60 * 1000));
  }
  
  // Сохраняем строковое имя стадии, а не ObjectId
  const task = await Task.create({ 
    ...req.body, 
    expiredDate, 
    stage: stageName // Используем имя стадии вместо ObjectId
  });
  res.status(201).json({ task });
});

const getTask = asyncWrapper(async (req, res, next) => {
  const { id: taskID } = req.params;
  const task = await Task.findOne({ _id: taskID });
  if (!task) {
    return next(createCustomError(`No task with id : ${taskID}`, 404));
  }
  res.status(200).json({ task });
});

const deleteTask = asyncWrapper(async (req, res, next) => {
  const { id: taskID } = req.params;
  const task = await Task.findOneAndDelete({ _id: taskID });
  if (!task) {
    return next(createCustomError(`No task with id : ${taskID}`, 404));
  }
  res.status(200).json({ task });
});

const updateTask = asyncWrapper(async (req, res, next) => {
  const { id: taskID } = req.params;
  const updateDate = new Date(Date.now() + (180 * 60 * 1000));

  // Преобразуем stage из ObjectId в строковое имя, если нужно
  const updateData = { ...req.body, updateDate };
  
  if (req.body.stage) {
    // Если передан stage, проверяем, это ObjectId или строка
    const stageDoc = await Stage.findById(req.body.stage);
    if (stageDoc) {
      updateData.stage = stageDoc.name; // Используем имя стадии
    } else if (!['ready', 'progress', 'review', 'done'].includes(req.body.stage)) {
      // Если это не ObjectId и не валидное имя стадии, возвращаем ошибку
      return next(createCustomError(`Invalid stage value: ${req.body.stage}`, 400));
    }
    // Если это уже валидное имя стадии, оставляем как есть
  }

  const task = await Task.findOneAndUpdate({ _id: taskID }, updateData, {
    new: true,
    runValidators: true,
  });

  if (!task) {
    return next(createCustomError(`No task with id : ${taskID}`, 404));
  }

  res.status(200).json({ task })
});

module.exports = {
  getAllTasks,
  createTask,
  getTask,
  updateTask,
  deleteTask,
};

