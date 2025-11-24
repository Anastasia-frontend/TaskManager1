# TaskManager

## Порядок установки и запуска

### Скачать и установить NodeJS 16.13.2
https://nodejs.org/download/release/v16.13.2/node-v16.13.2-x64.msi

### Скачать и установить MongoDB 4.4
https://fastdl.mongodb.org/windows/mongodb-windows-x86_64-4.4.16-signed.msi
Параметры установки по умолчанию

### В каталоге проекта, склонированного с github.com в командной строке выполнить
```
npm install
```
Это установит необходимые зависимости проекта

### Запустить backend командой
```
npm run start
```

### В браузере открыть страницу по адрусу
http://localhost:3000/
Должна появиться надпись "Заготовка". В этом случае все работает как надо.

## Разработка frontend

### Каталог для файлов frontend - public

В нем содержится корневой файл index.html
Все доп файлы должны размещаться только в этом каталоге.
Файлы скриптов в подкаталоге - scripts, стилей в подкаталоге - styles.

# Backend API

## Скачать и установить Postman
https://dl.pstmn.io/download/latest/win64

### Открыть Postman и создать Workspace

### Открыть вкладку Collections, нажать Import, в открывшемся окне нажать Upload Files и выбрать файл из папки проекта Task Manager.postman_collection.json, затем нажать Import
Будет загружена коллекция Task Manager c описанием и примерами API
