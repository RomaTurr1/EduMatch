# EduMatch

**EduMatch** — платформа для поиска команды на учебные проекты. Студент создаёт профиль, публикует проекты, находит тиммейтов по навыкам и общается с командой в реальном времени.

---

## Project Description

EduMatch решает типичную проблему: студенту нужны люди с нужными навыками на проект, но искать их приходится вручную. Платформа автоматически сопоставляет проекты и студентов по стеку технологий и скиллам, предлагает рекомендации прямо на главном экране и предоставляет встроенный чат для каждого проекта.

**Ключевые функции:**
- Регистрация и авторизация (JWT + Redis refresh-сессии)
- Создание и поиск проектов (по названию, стеку, навыкам)
- Поиск тиммейтов по навыкам, курсу и рейтингу
- Вступление в проект одним кликом
- Управление участниками проекта
- Realtime-чат внутри проекта через Socket.IO
- Персональный дашборд: мои проекты, мои заявки, рекомендации
- Тёмная / светлая тема
- Адаптивный дизайн (мобайл, планшет, десктоп)

---

## User Flow

```
1. Студент открывает EduMatch → видит страницу входа/регистрации

2. Регистрируется:
   - вводит имя, email, пароль
   - указывает курс, университет и навыки через запятую (React, Node, Python…)

3. Попадает на Dashboard:
   - видит метрики (проекты, заявки, рекомендации)
   - платформа уже показывает проекты, подходящие под его навыки

4. Заходит в раздел Projects → ищет по названию / технологии / скиллу
   - нажимает "Open" на интересном проекте
   - нажимает "Apply" → сразу становится участником

5. Создаёт собственный проект:
   - нажимает "New" в Projects
   - вводит название, описание, стек, нужные навыки
   - проект появляется в общем списке

6. Заходит в проект → видит список участников и чат
   - пишет сообщение команде в реальном времени

7. Находит тиммейтов через Teammates:
   - фильтрует по скиллу / курсу / минимальному рейтингу

8. Обновляет свой профиль:
   - загружает фото, меняет bio, корректирует навыки
```

---

## Figma / Design

Дизайн выполнен прямо в коде с использованием кастомных CSS-переменных, градиентов и glassmorphism-эффектов.

**Стиль:**
- Цветовая схема: тёмный фон `#0b0f19`, акцент `#8b5cf6` (фиолетовый) + `#22d3ee` (циан)
- Backdrop-filter blur на панелях → стеклянный эффект
- Плавная анимация фонового градиента (`meshShift`)
- Сетка-подложка из полупрозрачных линий
- Кнопки поднимаются на `translateY(-2px)` при hover

**Адаптивность:**
- `≥ 940px` — sidebar слева, контент справа
- `< 940px` — sidebar сверху с иконками навигации
- `< 620px` — все секции в одну колонку

> Figma-макет не создавался — дизайн реализован непосредственно в CSS/TSX.

---

## Database Structure

**СУБД:** PostgreSQL  
**ORM:** Prisma

### Таблицы и поля

#### `User`
| Поле          | Тип        | Описание                          |
|---------------|------------|-----------------------------------|
| `id`          | String (cuid) | Первичный ключ               |
| `email`       | String     | Уникальный email                  |
| `passwordHash`| String     | Bcrypt-хэш пароля                 |
| `name`        | String     | Имя студента                      |
| `bio`         | String?    | Краткое описание                  |
| `course`      | String?    | Курс / специальность              |
| `university`  | String?    | Университет                       |
| `avatarUrl`   | String?    | URL фото профиля                  |
| `skills`      | String[]   | Массив навыков                    |
| `rating`      | Float      | Рейтинг (по умолчанию 0)          |
| `createdAt`   | DateTime   | Дата регистрации                  |
| `updatedAt`   | DateTime   | Дата последнего обновления        |

#### `Project`
| Поле             | Тип              | Описание                        |
|------------------|------------------|---------------------------------|
| `id`             | String (cuid)    | Первичный ключ                  |
| `title`          | String           | Название проекта                |
| `description`    | String           | Описание                        |
| `techStack`      | String[]         | Стек технологий                 |
| `requiredSkills` | String[]         | Необходимые навыки              |
| `status`         | ProjectStatus    | OPEN / IN_PROGRESS / COMPLETED / ARCHIVED |
| `ownerId`        | String (FK)      | Владелец → User                 |
| `createdAt`      | DateTime         | Дата создания                   |
| `updatedAt`      | DateTime         | Дата обновления                 |

#### `ProjectMember`
| Поле        | Тип           | Описание                        |
|-------------|---------------|---------------------------------|
| `id`        | String (cuid) | Первичный ключ                  |
| `projectId` | String (FK)   | Ссылка → Project                |
| `userId`    | String (FK)   | Ссылка → User                   |
| `role`      | String        | `owner` или `member`            |
| `joinedAt`  | DateTime      | Дата вступления                 |

#### `Application`
| Поле        | Тип               | Описание                         |
|-------------|-------------------|----------------------------------|
| `id`        | String (cuid)     | Первичный ключ                   |
| `projectId` | String (FK)       | Ссылка → Project                 |
| `userId`    | String (FK)       | Ссылка → User                    |
| `note`      | String?           | Сопроводительная заметка         |
| `status`    | ApplicationStatus | PENDING / ACCEPTED / REJECTED / WITHDRAWN |
| `createdAt` | DateTime          | Дата подачи                      |
| `updatedAt` | DateTime          | Дата обновления                  |

#### `ChatMessage`
| Поле        | Тип           | Описание                      |
|-------------|---------------|-------------------------------|
| `id`        | String (cuid) | Первичный ключ                |
| `projectId` | String (FK)   | Ссылка → Project              |
| `userId`    | String (FK)   | Автор → User                  |
| `body`      | String        | Текст сообщения               |
| `createdAt` | DateTime      | Дата отправки                 |

### Связи
```
User ──< Project          (один пользователь владеет многими проектами)
User ──< ProjectMember    (пользователь участвует во многих проектах)
User ──< Application      (пользователь подаёт много заявок)
User ──< ChatMessage      (пользователь пишет много сообщений)
Project ──< ProjectMember
Project ──< Application
Project ──< ChatMessage
```

---

## Frontend

**Стек:** React 18 · TypeScript · Vite · lucide-react · Socket.IO client  
**Директория:** `apps/web/`

### Страницы

| Страница            | Маршрут (view)  | Описание                                                   |
|---------------------|-----------------|------------------------------------------------------------|
| `AuthPage`          | —               | Вход / регистрация с переключением форм                    |
| `DashboardPage`     | `dashboard`     | Метрики, мои проекты, мои заявки, рекомендации             |
| `ProjectsPage`      | `projects`      | Список проектов с фильтрами + форма создания               |
| `ProjectDetailPage` | `project-detail`| Участники, теги, чат проекта (Socket.IO)                   |
| `TeammatesPage`     | `teammates`     | Поиск студентов по навыкам, курсу, рейтингу                |
| `ProfilePage`       | `profile`       | Редактирование профиля, аватар, навыки                     |

### Компоненты

| Компонент      | Описание                                              |
|----------------|-------------------------------------------------------|
| `Shell`        | Layout: боковая навигация + основной контент          |
| `ProjectCard`  | Карточка проекта (статус, стек, участники, кнопка)    |

### Сервисы
- `services/api.ts` — обёртка над `fetch` с авторизацией и авто-refresh токена
- `hooks/useSocket.ts` — синглтон Socket.IO соединения с JWT-аутентификацией

---

## Backend

**Стек:** Node.js · Express · TypeScript · Prisma · Redis · Socket.IO  
**Директория:** `apps/api/`

### Архитектура

```
src/
  app.ts           — создание Express-приложения, middleware
  server.ts        — запуск HTTP + Socket.IO сервера
  config/
    env.ts         — типизированные переменные окружения
    prisma.ts      — singleton Prisma Client
    redis.ts       — Redis клиент
  middleware/
    auth.ts        — JWT Bearer проверка (requireAuth)
    error.ts       — глобальный error handler
  controllers/
    auth.controller.ts       — signup, signin, refresh, signout
    profile.controller.ts    — getMe, updateMe
    projects.controller.ts   — CRUD проектов + заявки + участники
    teammates.controller.ts  — поиск студентов
    dashboard.controller.ts  — агрегированные данные для дашборда
  routes/          — Express-роутеры для каждой группы
  services/
    session.service.ts  — Redis-сессии для refresh-токенов
  sockets/
    chat.socket.ts — Socket.IO: join комнаты, create/broadcast сообщений
  utils/
    jwt.ts         — sign/verify access и refresh токенов
    asyncHandler.ts — обёртка для async controller без try/catch
    publicUser.ts  — убирает passwordHash из ответа
```

### Аутентификация
- **Access token** — JWT, живёт 15 минут
- **Refresh token** — JWT, привязан к сессии в Redis (30 дней)
- При истечении access-токена клиент автоматически обновляет его через `/auth/refresh`

---

## API Endpoints

Базовый URL: `http://localhost:4000/api`  
Защищённые маршруты требуют заголовок: `Authorization: Bearer <access_token>`

### Auth

| Метод  | Endpoint              | Auth | Описание                        |
|--------|-----------------------|------|---------------------------------|
| POST   | `/auth/signup`        | —    | Регистрация нового пользователя |
| POST   | `/auth/signin`        | —    | Вход (возвращает токены)        |
| POST   | `/auth/refresh`       | —    | Обновление access-токена        |
| POST   | `/auth/signout`       | —    | Выход (отзыв refresh-сессии)    |

### Profile

| Метод  | Endpoint              | Auth | Описание                        |
|--------|-----------------------|------|---------------------------------|
| GET    | `/profile/me`         | ✅   | Получить свой профиль           |
| PATCH  | `/profile/me`         | ✅   | Обновить профиль                |

### Projects

| Метод  | Endpoint                              | Auth | Описание                              |
|--------|---------------------------------------|------|---------------------------------------|
| GET    | `/projects?q=&tech=&skills=`         | ✅   | Список проектов с фильтрацией         |
| POST   | `/projects`                           | ✅   | Создать проект                        |
| GET    | `/projects/:id`                       | ✅   | Получить проект с участниками и чатом |
| PATCH  | `/projects/:id`                       | ✅   | Обновить проект (только владелец)     |
| DELETE | `/projects/:id`                       | ✅   | Удалить проект (только владелец)      |
| POST   | `/projects/:id/applications`          | ✅   | Вступить в проект                     |
| DELETE | `/projects/:id/members/:userId`       | ✅   | Удалить участника (только владелец)   |

### Teammates

| Метод  | Endpoint                             | Auth | Описание                             |
|--------|--------------------------------------|------|--------------------------------------|
| GET    | `/teammates?skills=&course=&rating=` | ✅   | Поиск студентов по фильтрам          |

### Dashboard

| Метод  | Endpoint     | Auth | Описание                                             |
|--------|--------------|------|------------------------------------------------------|
| GET    | `/dashboard` | ✅   | Мои проекты + мои заявки + рекомендованные проекты   |

### Health

| Метод | Endpoint      | Auth | Описание            |
|-------|---------------|------|---------------------|
| GET   | `/health`     | —    | Проверка работы API |

### WebSocket (Socket.IO)

Подключение с токеном:
```js
const socket = io("http://localhost:4000", {
  auth: { token: accessToken }
});
```

| Событие          | Направление      | Данные                         | Описание                        |
|------------------|------------------|--------------------------------|---------------------------------|
| `project:join`   | client → server  | `projectId: string`            | Войти в комнату проекта         |
| `message:create` | client → server  | `{ projectId, body }`          | Отправить сообщение             |
| `message:new`    | server → clients | `ChatMessage`                  | Новое сообщение всем в комнате  |

---

## How to Run

### Требования
- Node.js 18+
- Docker & Docker Compose

### Шаги

```bash
# 1. Клонировать репозиторий
git clone https://github.com/RomaTurr1/EduMatch.git
cd EduMatch

# 2. Установить зависимости
npm install

# 3. Создать файл переменных окружения
cp .env.example .env

# 4. Запустить PostgreSQL и Redis
docker compose up -d

# 5. Сгенерировать Prisma Client и применить миграции
npm run prisma:generate
npm run prisma:migrate -- --name init

# 6. Запустить проект
npm run dev
```

**Адреса:**
| Сервис     | URL                          |
|------------|------------------------------|
| Frontend   | http://localhost:5173         |
| API        | http://localhost:4000/api    |
| Socket.IO  | http://localhost:4000        |

### Переменные окружения (`.env`)

```env
DATABASE_URL="postgresql://edumatch:edumatch@localhost:5432/edumatch?schema=public"
REDIS_URL="redis://localhost:6379"
JWT_ACCESS_SECRET="replace-with-a-long-random-access-secret"
JWT_REFRESH_SECRET="replace-with-a-long-random-refresh-secret"
ACCESS_TOKEN_TTL="15m"
REFRESH_TOKEN_TTL_DAYS="30"
PORT="4000"
WEB_ORIGIN="http://localhost:5173"
VITE_API_URL="http://localhost:4000/api"
VITE_SOCKET_URL="http://localhost:4000"
```

---

## Monorepo Layout

```
EduMatch/
  apps/
    api/                   Express API — Prisma, Redis, Socket.IO
      src/
        controllers/       Логика обработки запросов
        routes/            Маршруты Express
        middleware/        Auth, Error handler
        services/          Redis-сессии
        sockets/           Socket.IO чат
        config/            Prisma, Redis, ENV
        utils/             JWT, asyncHandler
      prisma/
        schema.prisma      Схема базы данных
    web/                   React + Vite фронтенд
      src/
        pages/             Страницы приложения
        components/        Переиспользуемые компоненты
        services/          API-клиент
        hooks/             useSocket
        types/             TypeScript-типы
  packages/
    shared/                Общие типы (DTO)
  docker-compose.yml       PostgreSQL + Redis
  .env.example             Шаблон переменных окружения
```

---

## Plan for Next Week

| Приоритет | Задача                                                              |
|-----------|---------------------------------------------------------------------|
| 🔴 High   | Добавить эндпоинт для просмотра и подтверждения заявок владельцем проекта (`PATCH /projects/:id/applications/:appId`) |
| 🔴 High   | Добавить пагинацию к `/projects` и `/teammates`                    |
| 🟡 Medium | Реализовать загрузку аватаров на сервер (Multer + S3/локальное хранилище) |
| 🟡 Medium | Добавить страницу публичного профиля другого студента              |
| 🟡 Medium | Добавить уведомления при вступлении нового участника в проект      |
| 🟢 Low    | Написать тесты для auth middleware и контроллеров                   |
| 🟢 Low    | Добавить rate limiting (express-rate-limit)                        |
| 🟢 Low    | Email-верификация при регистрации                                   |
