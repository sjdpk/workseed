# API Documentation

Complete reference for the Workseed API endpoints.

## Authentication

All API endpoints (except login) require authentication via HTTP-only cookie.

### Headers

```
Cookie: auth-token=<jwt-token>
```

### Response Format

All responses follow a consistent format:

**Success Response:**

```json
{
  "success": true,
  "data": { ... }
}
```

**Error Response:**

```json
{
  "success": false,
  "error": "Error message"
}
```

---

## Authentication Endpoints

### POST /api/auth/login

Authenticate a user and create a session.

**Request Body:**

```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

**Success Response (200):**

```json
{
  "success": true,
  "data": {
    "user": {
      "id": "uuid",
      "email": "user@example.com",
      "firstName": "John",
      "lastName": "Doe",
      "role": "EMPLOYEE",
      "employeeId": "EMP00001",
      "branch": { "id": "uuid", "name": "HQ" }
    }
  }
}
```

### POST /api/auth/logout

End the current session.

**Success Response (200):**

```json
{
  "success": true
}
```

### GET /api/auth/me

Get current authenticated user.

**Success Response (200):**

```json
{
  "success": true,
  "data": {
    "user": { ... }
  }
}
```

---

## User Management

### GET /api/users

List all users (HR/Admin only).

**Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| page | number | Page number (default: 1) |
| limit | number | Items per page (default: 10) |
| search | string | Search by name, email, or ID |
| teamId | string | Filter by team |
| departmentId | string | Filter by department |

**Success Response (200):**

```json
{
  "success": true,
  "data": {
    "users": [...],
    "pagination": {
      "page": 1,
      "limit": 10,
      "total": 50,
      "totalPages": 5
    }
  }
}
```

### POST /api/users

Create a new user (HR/Admin only).

**Request Body:**

```json
{
  "email": "newuser@example.com",
  "password": "password123",
  "firstName": "Jane",
  "lastName": "Doe",
  "role": "EMPLOYEE",
  "employeeId": "EMP00002",
  "departmentId": "uuid",
  "teamId": "uuid"
}
```

### GET /api/users/:id

Get user by ID.

### PATCH /api/users/:id

Update user details.

---

## Organization Structure

### Branches

| Method | Endpoint          | Description       | Access   |
| ------ | ----------------- | ----------------- | -------- |
| GET    | /api/branches     | List all branches | All      |
| POST   | /api/branches     | Create branch     | HR/Admin |
| GET    | /api/branches/:id | Get branch        | All      |
| PATCH  | /api/branches/:id | Update branch     | HR/Admin |
| DELETE | /api/branches/:id | Delete branch     | HR/Admin |

### Departments

| Method | Endpoint             | Description       | Access   |
| ------ | -------------------- | ----------------- | -------- |
| GET    | /api/departments     | List departments  | All      |
| POST   | /api/departments     | Create department | HR/Admin |
| GET    | /api/departments/:id | Get department    | All      |
| PATCH  | /api/departments/:id | Update department | HR/Admin |
| DELETE | /api/departments/:id | Delete department | HR/Admin |

### Teams

| Method | Endpoint       | Description | Access   |
| ------ | -------------- | ----------- | -------- |
| GET    | /api/teams     | List teams  | All      |
| POST   | /api/teams     | Create team | HR/Admin |
| GET    | /api/teams/:id | Get team    | All      |
| PATCH  | /api/teams/:id | Update team | HR/Admin |

---

## Leave Management

### Leave Types

| Method | Endpoint             | Description       | Access   |
| ------ | -------------------- | ----------------- | -------- |
| GET    | /api/leave-types     | List leave types  | All      |
| POST   | /api/leave-types     | Create leave type | HR/Admin |
| GET    | /api/leave-types/:id | Get leave type    | All      |
| PATCH  | /api/leave-types/:id | Update leave type | HR/Admin |
| DELETE | /api/leave-types/:id | Delete leave type | Admin    |

### Leave Allocations

| Method | Endpoint                   | Description       | Access               |
| ------ | -------------------------- | ----------------- | -------------------- |
| GET    | /api/leave-allocations     | Get allocations   | All (own) / HR (all) |
| POST   | /api/leave-allocations     | Create allocation | HR/Admin             |
| GET    | /api/leave-allocations/:id | Get allocation    | All (own) / HR (all) |
| PATCH  | /api/leave-allocations/:id | Update allocation | HR/Admin             |

### Leave Requests

| Method | Endpoint                   | Description    | Access |
| ------ | -------------------------- | -------------- | ------ |
| GET    | /api/leave-requests        | List requests  | All    |
| POST   | /api/leave-requests        | Create request | All    |
| PATCH  | /api/leave-requests?id=:id | Update status  | Varies |

**GET Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| userId | string | Filter by user (HR/Admin) |
| status | string | Filter by status |
| pending | boolean | Show pending approvals |
| all | boolean | Show all (role-based) |
| team | boolean | Show team leaves |

**POST Request Body:**

```json
{
  "leaveTypeId": "uuid",
  "startDate": "2024-01-15",
  "endDate": "2024-01-17",
  "days": 3,
  "isHalfDay": false,
  "reason": "Family vacation"
}
```

**PATCH Request Body (Approve/Reject):**

```json
{
  "status": "APPROVED",
  "rejectionReason": "Optional reason for rejection"
}
```

---

## Asset Management

### Assets

| Method | Endpoint        | Description  | Access               |
| ------ | --------------- | ------------ | -------------------- |
| GET    | /api/assets     | List assets  | All (filtered)       |
| POST   | /api/assets     | Create asset | HR/Admin             |
| GET    | /api/assets/:id | Get asset    | All (own) / HR (all) |
| PATCH  | /api/assets/:id | Update asset | HR/Admin             |
| DELETE | /api/assets/:id | Soft delete  | HR/Admin             |

**GET Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| page | number | Page number |
| limit | number | Items per page |
| search | string | Search assets |
| category | string | Filter by category |
| status | string | Filter by status |
| userId | string | Filter by assigned user |
| unassigned | boolean | Show unassigned only |

### Asset Assignment

| Method | Endpoint           | Description  | Access   |
| ------ | ------------------ | ------------ | -------- |
| POST   | /api/assets/assign | Assign asset | HR/Admin |
| PATCH  | /api/assets/assign | Return asset | HR/Admin |

**POST Request (Assign):**

```json
{
  "assetId": "uuid",
  "userId": "uuid",
  "notes": "Optional notes"
}
```

**PATCH Request (Return):**

```json
{
  "assetId": "uuid",
  "returnCondition": "GOOD",
  "returnNotes": "Optional notes"
}
```

---

## Attendance

### Check-in/Check-out

| Method | Endpoint                 | Description            |
| ------ | ------------------------ | ---------------------- |
| GET    | /api/attendance/status   | Get current status     |
| POST   | /api/attendance/checkin  | Record check-in        |
| POST   | /api/attendance/checkout | Record check-out       |
| GET    | /api/attendance/history  | Get attendance history |
| GET    | /api/attendance/records  | Get records (HR/Admin) |

### Devices

| Method | Endpoint                    | Description     | Access   |
| ------ | --------------------------- | --------------- | -------- |
| GET    | /api/attendance/devices     | List devices    | HR/Admin |
| POST   | /api/attendance/devices     | Register device | Admin    |
| PATCH  | /api/attendance/devices/:id | Update device   | Admin    |
| DELETE | /api/attendance/devices/:id | Delete device   | Admin    |

---

## Other Endpoints

### Dashboard

| Method | Endpoint       | Description         |
| ------ | -------------- | ------------------- |
| GET    | /api/dashboard | Get dashboard stats |

### Notices

| Method | Endpoint         | Description   | Access   |
| ------ | ---------------- | ------------- | -------- |
| GET    | /api/notices     | List notices  | All      |
| POST   | /api/notices     | Create notice | HR/Admin |
| PATCH  | /api/notices/:id | Update notice | HR/Admin |
| DELETE | /api/notices/:id | Delete notice | HR/Admin |

### Holidays

| Method | Endpoint          | Description    | Access   |
| ------ | ----------------- | -------------- | -------- |
| GET    | /api/holidays     | List holidays  | All      |
| POST   | /api/holidays     | Create holiday | HR/Admin |
| PATCH  | /api/holidays/:id | Update holiday | HR/Admin |
| DELETE | /api/holidays/:id | Delete holiday | HR/Admin |

### Employee Requests

| Method | Endpoint          | Description    |
| ------ | ----------------- | -------------- |
| GET    | /api/requests     | List requests  |
| POST   | /api/requests     | Create request |
| PATCH  | /api/requests/:id | Update request |

### Audit Logs

| Method | Endpoint        | Description     | Access   |
| ------ | --------------- | --------------- | -------- |
| GET    | /api/audit-logs | View audit logs | HR/Admin |

### Organization Settings

| Method | Endpoint          | Description     | Access |
| ------ | ----------------- | --------------- | ------ |
| GET    | /api/organization | Get settings    | All    |
| PATCH  | /api/organization | Update settings | Admin  |

### Reports

| Method | Endpoint     | Description      | Access   |
| ------ | ------------ | ---------------- | -------- |
| GET    | /api/reports | Generate reports | HR/Admin |

---

## Error Codes

| Status | Description                          |
| ------ | ------------------------------------ |
| 400    | Bad Request - Invalid input data     |
| 401    | Unauthorized - Not authenticated     |
| 403    | Forbidden - Insufficient permissions |
| 404    | Not Found - Resource does not exist  |
| 500    | Internal Server Error                |

---

## Rate Limiting

Currently, no rate limiting is implemented. Consider adding rate limiting for production deployments.

---

## Changelog

### v0.1.0

- Initial API implementation
- User authentication and management
- Leave management system
- Asset tracking
- Attendance system
- Audit logging
