$(function () {
    //Порт 
    const API_BASE = 'http://localhost:3000/api/v1';
    const TASKS_API = `${API_BASE}/tasks`;
    const STAGES_API = `${API_BASE}/stages`;
    
    let tasks = [];
    let stages = []; 
    let currentTaskId = null;
    let currentDeleteId = null;
    // Добавлено хранение текущей сортировки для каждой колонки
    let sortState = {
        ready: { field: null, order: 'asc' },
        progress: { field: null, order: 'asc' },
        review: { field: null, order: 'asc' },
        done: { field: null, order: 'asc' }
    };

    // Загрузка стадий из API
    async function loadStages() {
        try {
            const response = await fetch(STAGES_API);
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            const data = await response.json();
            stages = data.stages || [];
            
            // Заполняем селект стадий в форме
            const select = $('#stage-select');
            select.empty();
            stages.forEach(stage => {
                const option = $('<option></option>')
                    .attr('value', stage._id)
                    .text(stage.name === 'ready' ? 'Ready' : 
                          stage.name === 'progress' ? 'Progress' : 
                          stage.name === 'review' ? 'Review' : 'Done');
                select.append(option);
            });
        } catch (error) {
            console.error('Ошибка загрузки стадий:', error);
        }
    }

    // Загрузка задач из API вместо локального хранилища
    async function loadTasks() {
        try {
            const response = await fetch(TASKS_API);
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            const data = await response.json();
            tasks = data.tasks || [];
            console.log('Задачи успешно загружены:', tasks);
            renderTasks();
        } catch (error) {
            console.error('Ошибка загрузки задач:', error);
            alert('Не удалось загрузить задачи с сервера');
        }
    }

    // Форматирование даты для отображения
    function formatDate(dateString) {
        if (!dateString) return 'Не указана';
        const date = new Date(dateString);
        return date.toLocaleDateString('ru-RU', { 
            day: '2-digit', 
            month: '2-digit', 
            year: 'numeric' 
        });
    }

    // Получение названия стадии по ID
    function getStageName(stageId) {
        if (typeof stageId === 'string' && ['ready', 'progress', 'review', 'done'].includes(stageId)) {
            return stageId;
        }
        const stage = stages.find(s => s._id === stageId || s.name === stageId);
        return stage ? stage.name : 'ready';
    }

    // Сортировка задач для конкретной колонки
    function sortTasksForColumn(status) {
        const sort = sortState[status];
        if (!sort.field) return tasks.filter(t => getStageName(t.stage) === status);
        
        let filtered = tasks.filter(t => getStageName(t.stage) === status);
        
        filtered.sort((a, b) => {
            let aVal, bVal;
            
            switch(sort.field) {
                case 'title':
                    aVal = (a.title || '').toLowerCase();
                    bVal = (b.title || '').toLowerCase();
                    break;
                case 'created':
                    aVal = new Date(a.creationDate || 0);
                    bVal = new Date(b.creationDate || 0);
                    break;
                case 'due':
                    aVal = new Date(a.expiredDate || 0);
                    bVal = new Date(b.expiredDate || 0);
                    break;
                default:
                    return 0;
            }
            
            if (aVal < bVal) return sort.order === 'asc' ? -1 : 1;
            if (aVal > bVal) return sort.order === 'asc' ? 1 : -1;
            return 0;
        });
        
        return filtered;
    }

    // Отображение задач с датами и правильной структурой
    function renderTasks() {
        $('.tasks-container').empty();

        if (tasks.length === 0) {
            $('.tasks-container').html('<div class="no-tasks">Нет задач</div>');
            updateProgress();
            return;
        }

        // Рендерим задачи с учетом сортировки для каждой колонки
        ['ready', 'progress', 'review', 'done'].forEach(status => {
            const column = $(`.column[data-status="${status}"] .tasks-container`);
            const sortedTasks = sortTasksForColumn(status);
            
            if (sortedTasks.length === 0) {
                column.html('<div class="no-tasks">Нет задач</div>');
                return;
            }

            sortedTasks.forEach(task => {
                const stageName = getStageName(task.stage);
                
                // Добавлено отображение дат создания и планируемого завершения
                const card = $(`
                    <div class="task-card" data-id="${task._id}" draggable="true">
                        <button class="dots-menu"><i class="fas fa-ellipsis-v"></i></button>
                        <div class="task-title">${task.title || 'Нет названия'}</div>
                        <div class="task-desc">${task.value || ''}</div>
                        <div class="task-meta">
                            <span>Создано: ${formatDate(task.creationDate)}</span>
                            <span>Срок: ${formatDate(task.expiredDate)}</span>
                        </div>
                        <div class="progress-bar">
                            <div class="progress-fill" style="width:${task.completeProgress || 0}%"></div>
                        </div>
                    </div>
                `);

                // Кнопка троеточия для контекстного меню
                card.find('.dots-menu').click(function(e) {
                    e.stopPropagation();
                    currentTaskId = task._id;
                    $('#context-menu')
                        .addClass('active')
                        .css({ top: e.pageY + 5, left: e.pageX - 80 });
                });

                // Drag & drop
                card.on('dragstart', function(e) {
                    $(this).addClass('dragging');
                    e.originalEvent.dataTransfer.setData('id', task._id);
                });

                card.on('dragend', function() {
                    $(this).removeClass('dragging');
                });

                column.append(card);
            });
        });

        updateProgress();
    }

    // Расчет прогресса - процент выполненных задач относительно всех
    function updateProgress() {
        if (tasks.length === 0) {
            $('#progress-percent').text('0%');
            $('#progress-fill').css('width', '0%');
            $('#total-count').text('0');
            $('#done-count').text('0');
            return;
        }

        const doneCount = tasks.filter(task => {
            const stageName = getStageName(task.stage);
            return stageName === 'done';
        }).length;
        
        const progressPercent = Math.round((doneCount / tasks.length) * 100);
        
        $('#progress-percent').text(progressPercent + '%');
        $('#progress-fill').css('width', progressPercent + '%');
        $('#total-count').text(tasks.length);
        $('#done-count').text(doneCount);
    }

    // Кнопка "Добавить задачу" — открытие формы создания
    $('#add-task-btn').click(() => {
    currentTaskId = null;                                  
    $('#modal-title').text('Создать задание');
    $('#task-form')[0].reset();                            

    // Прогресс по умолчанию = 0, но пользователь может изменить
    const progressInput = $('#task-form [name="progress"]');
    progressInput.val(0);                                   
    $('#progress-value').text('0');                         

    // Стадия по умолчанию — Ready
    const defaultStage = stages.find(s => s.default) || stages.find(s => s.name === 'ready');
    if (defaultStage) {
        $('#stage-select').val(defaultStage._id);
    }

    $('#task-modal').addClass('active');
});

    // Сохранение задачи через API
    $('#task-form').submit(async function(e) {
        e.preventDefault();
        
        const title = $('#task-form [name="title"]').val().trim();
        const value = $('#task-form [name="description"]').val().trim();
        const dueDate = $('#task-form [name="dueDate"]').val();
        const stageId = $('#task-form [name="stage"]').val();
        const completeProgress = parseInt($('#task-form [name="progress"]').val()) || 0;

        if (!title || !value || !stageId) {
            alert('Заполните все обязательные поля');
            return;
        }

        // Формат даты - timestamp в миллисекундах согласно Postman коллекции
        const expiredDate = dueDate ? new Date(dueDate).getTime() : undefined;

        try {
            if (currentTaskId) {
                // Обновление существующей задачи через API
                const updateData = {
                    title,
                    value,
                    expiredDate: expiredDate ? expiredDate.toString() : undefined,
                    stage: stageId,
                    completeProgress
                };
                
                const response = await fetch(`${TASKS_API}/${currentTaskId}`, {
                    method: 'PATCH',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(updateData)
                });

                if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
                
                console.log('Задача обновлена');
        } else {
            // СОЗДАНИЕ НОВОЙ задачи — теперь с правильным прогрессом!
        const completeProgress = parseInt($('#task-form [name="progress"]').val()) || 0;

        const createData = {
        title,
        value,
        expiredDate: expiredDate ? expiredDate.toString() : undefined,
        stage: stageId,
        completeProgress: completeProgress              
    };

    const response = await fetch(TASKS_API, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(createData)
    });

    if (!response.ok) {
        const err = await response.text();
        throw new Error(`Создание задачи: ${response.status} — ${err}`);
    }

    console.log('Задача успешно создана с прогрессом:', completeProgress);
}

            $('#task-modal').removeClass('active');
            await loadTasks(); // Перезагружаем задачи после сохранения
            
        } catch (error) {
            console.error('Ошибка:', error);
            alert('Не удалось сохранить задачу: ' + error.message);
        }
    });

    // Контекстное меню с правильной работой
    $('#context-menu').on('click', 'button', async function() {
        const action = $(this).data('action');
        $('#context-menu').removeClass('active');

        if (action === 'edit') {
            // Загрузка задачи для редактирования через API
            try {
                const response = await fetch(`${TASKS_API}/${currentTaskId}`);
                if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
                const data = await response.json();
                const task = data.task;
                
                if (task) {
                    $('#modal-title').text('Редактировать задание');
                    $('#task-form [name="title"]').val(task.title || '');
                    $('#task-form [name="description"]').val(task.value || '');
                    
                    // Правильное отображение даты в input[type="date"]
                    if (task.expiredDate) {
                        const date = new Date(task.expiredDate);
                        const dateStr = date.toISOString().split('T')[0];
                        $('#task-form [name="dueDate"]').val(dateStr);
                    }
                    
                    // Установка стадии (может быть ObjectId или строка)
                    const stageId = typeof task.stage === 'object' ? task.stage._id : task.stage;
                    $('#task-form [name="stage"]').val(stageId);
                    
                    $('#task-form [name="progress"]').val(task.completeProgress || 0);
                    $('#progress-value').text(task.completeProgress || 0);
                    $('#task-modal').addClass('active');
                }
            } catch (error) {
                console.error('Ошибка загрузки задачи:', error);
                alert('Не удалось загрузить задачу для редактирования');
            }
        }

        if (action === 'delete') {
            currentDeleteId = currentTaskId;
            $('#delete-modal').addClass('active');
        }
    });

    // Подтверждение удаления через API
    $('#confirm-delete').click(async function() {
        if (!currentDeleteId) return;
        
        try {
            const response = await fetch(`${TASKS_API}/${currentDeleteId}`, {
                method: 'DELETE'
            });

            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            
            console.log('Задача удалена');
            $('#delete-modal').removeClass('active');
            currentDeleteId = null;
            await loadTasks(); // Перезагружаем задачи после удаления
        } catch (error) {
            console.error('Ошибка удаления:', error);
            alert('Не удалось удалить задачу: ' + error.message);
        }
    });

    // Drag & drop между колонками с обновлением через API
    $('.tasks-container')
        .on('dragover', function(e) {
            e.preventDefault();
            $(this).addClass('drag-over');
        })
        .on('dragleave', function() {
            $(this).removeClass('drag-over');
        })
        .on('drop', async function(e) {
            e.preventDefault();
            $(this).removeClass('drag-over');
            
            const id = e.originalEvent.dataTransfer.getData('id');
            const newStageName = $(this).closest('.column').data('status');
            
            // Находим ID стадии по названию
            const newStage = stages.find(s => s.name === newStageName);
            if (!newStage) {
                console.error('Стадия не найдена:', newStageName);
                return;
            }
            
            try {
                // Обновление стадии задачи через API
                const response = await fetch(`${TASKS_API}/${id}`, {
                    method: 'PATCH',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ stage: newStage._id })
                });

                if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
                
                console.log('Задача перемещена в:', newStageName);
                await loadTasks(); // Перезагружаем задачи после перемещения
            } catch (error) {
                console.error('Ошибка перемещения задачи:', error);
                alert('Не удалось переместить задачу');
            }
        });

    // Сортировка по колонкам
    $('.column-menu').click(function(e) {
        e.stopPropagation();
        const menu = $(this).siblings('.sort-menu');
        $('.sort-menu').not(menu).removeClass('active');
        menu.toggleClass('active');
    });

    // Обработка выбора сортировки
    $('.sort-item').click(function(e) {
        e.stopPropagation();
        const sortField = $(this).data('sort');
        const column = $(this).closest('.column');
        const status = column.data('status');
        
        // Переключаем порядок сортировки, если поле уже выбрано
        if (sortState[status].field === sortField) {
            sortState[status].order = sortState[status].order === 'asc' ? 'desc' : 'asc';
        } else {
            sortState[status].field = sortField;
            sortState[status].order = 'asc';
        }
        
        // Обновляем визуальное состояние
        column.find('.sort-item').removeClass('active');
        $(this).addClass('active');
        
        // Применяем сортировку
        renderTasks();
        
        // Закрываем меню
        $(this).closest('.sort-menu').removeClass('active');
    });

    // Прогресс в форме
    $('#task-form [name="progress"]').on('input', function() {
        $('#progress-value').text($(this).val());
    });

    // Закрытие модалок
    $(document).on('click', function(e) {
        if ($(e.target).hasClass('modal') || $(e.target).hasClass('btn-cancel')) {
            $('.modal').removeClass('active');
            $('#context-menu').removeClass('active');
        }
    });

    // Закрытие контекстного меню
    $(document).on('click', function(e) {
        if (!$(e.target).closest('#context-menu, .dots-menu').length) {
            $('#context-menu').removeClass('active');
        }
    });

    // Закрытие меню сортировки при клике вне его
    $(document).on('click', function(e) {
        if (!$(e.target).closest('.sort-dropdown').length) {
            $('.sort-menu').removeClass('active');
        }
    });

    // Загружаем стадии и задачи при старте
    loadStages().then(() => {
        loadTasks();
    });
});