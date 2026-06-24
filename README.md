# EduMatch

EduMatch — учебная fullstack-платформа для поиска команды на студенческие проекты. Пользователь создаёт профиль с характеристиками, публикует проекты, получает рекомендации, вступает в команды и общается в проектном чате.

## Основные возможности

- Регистрация и вход по JWT.
- Профиль студента: имя, возраст, специальность, курс, университет, bio, аватар.
- Выбор характеристик готовыми тегами: React, TypeScript, Figma, UI, Testing и другие.
- Создание и редактирование проектов.
- Статусы проектов: open, in progress, paused, completed, archived.
- Рекомендации проектов по совпадению характеристик пользователя и проекта.
- Вступление в открытые проекты.
- Invite-ссылки для проектов и заявки на вступление.
- Уведомления владельцу проекта о заявках.
- Поиск тиммейтов по навыкам, курсу и рейтингу.
- Realtime-чат внутри проекта.
- Загрузка файлов в проект и чат.
- Тёмная/светлая тема и адаптивный интерфейс.

## Демо-аккаунты

Основной аккаунт для показа:

```text
Email: test@test.com
Password: 12345678
```

Дополнительные аккаунты:

```text
test2@test.com ... test10@test.com
Password: 12345678
```

У аккаунтов заполнены разные имена, учебные заведения, возраст, специальности и характеристики.

## Как запустить

```bash
npm install
docker compose up -d
npm run prisma:generate
npm run dev
```

Адреса:

```text
Frontend: http://localhost:5173
API:      http://localhost:4000/api
Health:   http://localhost:4000/api/health
```

Если база уже настроена локально, обычно достаточно:

```bash
docker compose up -d
npm run dev
```

## Технологии

Frontend:

- React 18 — интерфейс приложения.
- TypeScript — типизация компонентов, API-ответов и данных.
- Vite — быстрый dev-сервер и сборка.
- lucide-react — иконки интерфейса.
- Socket.IO client — realtime-чат на фронтенде.

Backend:

- Node.js + Express — REST API.
- TypeScript — типизация backend-кода.
- Prisma — ORM для работы с PostgreSQL.
- PostgreSQL — основная база данных.
- Redis — хранение refresh-сессий.
- Socket.IO — realtime-сообщения в проектных чатах.
- JWT — access/refresh авторизация.
- Zod — валидация входящих данных.

Инфраструктура:

- npm workspaces — monorepo.
- Docker Compose — PostgreSQL и Redis локально.

## Структура проекта

```text
apps/
  api/      Backend: Express, Prisma, Socket.IO
  web/      Frontend: React, Vite
packages/
  shared/   Общие типы
docs/       Материалы и скриншоты
```

## Важные сущности базы

- `User` — профиль студента, характеристики, аватар, рейтинг.
- `Project` — проект, описание, стек, нужные навыки, статус, invite-код.
- `ProjectMember` — участники проекта.
- `Application` — заявки на вступление.
- `ChatMessage` — сообщения проектного чата.
- `ProjectFile` — файлы проекта и чата.
- `Notification` — уведомления о заявках и действиях.

## Основные API

```text
POST   /api/auth/signup
POST   /api/auth/signin
POST   /api/auth/refresh
GET    /api/profile/me
PATCH  /api/profile/me
GET    /api/dashboard
GET    /api/projects
POST   /api/projects
GET    /api/projects/:id
PATCH  /api/projects/:id
POST   /api/projects/invite/:code
POST   /api/projects/:id/applications
PATCH  /api/projects/:id/applications/:applicationId
GET    /api/teammates
GET    /api/notifications
```

## Рекомендации проектов

Рекомендации считаются по характеристикам пользователя:

- совпадения с `requiredSkills` проекта дают больший вес;
- совпадения с `techStack` тоже учитываются;
- проекты без совпадений не показываются;
- уже свои проекты и проекты, где пользователь участник, исключаются;
- показываются только проекты, куда реально можно вступить.

В интерфейсе совпавшие характеристики на карточке проекта выделяются активным цветом, а остальные остаются пассивными.

## Проверка перед защитой

```bash
npm run typecheck
npm run build
```

Обе команды должны проходить без ошибок.
