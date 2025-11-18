# GDG Babcock Specific Fields & Features

This document explains all the custom fields and features added specifically for GDG Babcock University.

## 📋 User Profile Fields

### Basic Information

- **`full_name`** (TEXT): User's full name
- **`email`** (TEXT, UNIQUE): User's email address
- **`whatsapp_number`** (TEXT): WhatsApp contact number
- **`avatar_url`** (TEXT): URL to user's profile picture
- **`gender`** (TEXT): User's gender
- **`birthday`** (TEXT): User's birth date

### Student Information

- **`student_status`** (TEXT): Current status
  - Options: `"undergraduate"`, `"postgraduate"`, `"alumni"`
- **`matric_no`** (TEXT): Matriculation number
- **`department`** (TEXT): Academic department (e.g., "Computer Science")
- **`faculty`** (TEXT): Faculty name (e.g., "Science & Technology")

### GDG Tracks & Skills

- **`primary_track`** (TEXT): Main focus area
  - Options: `"web"`, `"mobile"`, `"cloud"`, `"ai/ml"`, `"design"`, `"data"`
- **`secondary_track`** (TEXT): Secondary focus area (optional)
- **`primary_skill_level`** (TEXT): Proficiency in primary track
  - Options: `"beginner"`, `"intermediate"`, `"advanced"`
- **`secondary_skill_level`** (TEXT): Proficiency in secondary track

### Teams & Roles

- **`teams`** (TEXT[]): Array of teams user belongs to
  - Examples: `["organizing", "tech", "content", "design"]`
- **`roles`** (TEXT[]): Platform roles for authorization
  - Options: `["user", "admin", "moderator", "lead"]`

### Terms of Service

- **`tos_agreed`** (BOOLEAN): Whether user has agreed to TOS
- **`tos_agreed_at`** (TIMESTAMP): When user agreed to TOS
- **`tos_version`** (TEXT): Version of TOS user agreed to

## 🔌 API Endpoints

### User Profile Management

#### Update Profile

```http
PUT /auth/profile
Authorization: Bearer <access_token>
Content-Type: application/json

{
  "full_name": "John Doe",
  "whatsapp_number": "+2348012345678",
  "gender": "male",
  "birthday": "2000-01-15",
  "student_status": "undergraduate",
  "matric_no": "19/0001",
  "department": "Computer Science",
  "faculty": "Science & Technology",
  "primary_track": "web",
  "secondary_track": "mobile",
  "primary_skill_level": "intermediate",
  "secondary_skill_level": "beginner"
}
```

#### Agree to TOS

```http
POST /auth/tos/agree
Authorization: Bearer <access_token>
Content-Type: application/json

{
  "version": "1.0.0"
}
```

### Admin Endpoints (Require admin role)

#### Manage User Teams

```http
# Add team to user
POST /admin/users/:userId/teams
{
  "team": "tech"
}

# Remove team from user
DELETE /admin/users/:userId/teams/:team
```

#### Get Users by Track

```http
GET /admin/tracks/web/users
GET /admin/tracks/mobile/users
```

#### Get Users by Team

```http
GET /admin/teams/organizing/users
GET /admin/teams/tech/users
```

#### Get Students by Department

```http
GET /admin/departments/Computer%20Science/students
```

## 💻 Frontend Integration

### Complete User Profile Form

```jsx
// ProfileForm.jsx
import { useState } from "react";
import authService from "../services/authService";

export default function ProfileForm({ user, onUpdate }) {
  const [formData, setFormData] = useState({
    full_name: user?.full_name || "",
    whatsapp_number: user?.whatsapp_number || "",
    gender: user?.gender || "",
    birthday: user?.birthday || "",
    student_status: user?.student_status || "undergraduate",
    matric_no: user?.matric_no || "",
    department: user?.department || "",
    faculty: user?.faculty || "",
    primary_track: user?.primary_track || "",
    secondary_track: user?.secondary_track || "",
    primary_skill_level: user?.primary_skill_level || "beginner",
    secondary_skill_level: user?.secondary_skill_level || "beginner",
  });

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      const token = localStorage.getItem("access_token");
      const response = await fetch("http://localhost:3000/auth/profile", {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      });

      const data = await response.json();
      if (data.success) {
        onUpdate(data.user);
      }
    } catch (error) {
      console.error("Update failed:", error);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      {/* Basic Info */}
      <input
        type="text"
        placeholder="Full Name"
        value={formData.full_name}
        onChange={(e) =>
          setFormData({ ...formData, full_name: e.target.value })
        }
      />

      <input
        type="text"
        placeholder="WhatsApp Number"
        value={formData.whatsapp_number}
        onChange={(e) =>
          setFormData({ ...formData, whatsapp_number: e.target.value })
        }
      />

      <select
        value={formData.gender}
        onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
      >
        <option value="">Select Gender</option>
        <option value="male">Male</option>
        <option value="female">Female</option>
        <option value="other">Other</option>
      </select>

      <input
        type="date"
        value={formData.birthday}
        onChange={(e) => setFormData({ ...formData, birthday: e.target.value })}
      />

      {/* Student Info */}
      <select
        value={formData.student_status}
        onChange={(e) =>
          setFormData({ ...formData, student_status: e.target.value })
        }
      >
        <option value="undergraduate">Undergraduate</option>
        <option value="postgraduate">Postgraduate</option>
        <option value="alumni">Alumni</option>
      </select>

      <input
        type="text"
        placeholder="Matric Number"
        value={formData.matric_no}
        onChange={(e) =>
          setFormData({ ...formData, matric_no: e.target.value })
        }
      />

      <input
        type="text"
        placeholder="Department"
        value={formData.department}
        onChange={(e) =>
          setFormData({ ...formData, department: e.target.value })
        }
      />

      <input
        type="text"
        placeholder="Faculty"
        value={formData.faculty}
        onChange={(e) => setFormData({ ...formData, faculty: e.target.value })}
      />

      {/* GDG Tracks */}
      <select
        value={formData.primary_track}
        onChange={(e) =>
          setFormData({ ...formData, primary_track: e.target.value })
        }
      >
        <option value="">Select Primary Track</option>
        <option value="web">Web Development</option>
        <option value="mobile">Mobile Development</option>
        <option value="cloud">Cloud Engineering</option>
        <option value="ai/ml">AI/ML</option>
        <option value="design">UI/UX Design</option>
        <option value="data">Data Science</option>
      </select>

      <select
        value={formData.primary_skill_level}
        onChange={(e) =>
          setFormData({ ...formData, primary_skill_level: e.target.value })
        }
      >
        <option value="beginner">Beginner</option>
        <option value="intermediate">Intermediate</option>
        <option value="advanced">Advanced</option>
      </select>

      <select
        value={formData.secondary_track}
        onChange={(e) =>
          setFormData({ ...formData, secondary_track: e.target.value })
        }
      >
        <option value="">Select Secondary Track (Optional)</option>
        <option value="web">Web Development</option>
        <option value="mobile">Mobile Development</option>
        <option value="cloud">Cloud Engineering</option>
        <option value="ai/ml">AI/ML</option>
        <option value="design">UI/UX Design</option>
        <option value="data">Data Science</option>
      </select>

      {formData.secondary_track && (
        <select
          value={formData.secondary_skill_level}
          onChange={(e) =>
            setFormData({ ...formData, secondary_skill_level: e.target.value })
          }
        >
          <option value="beginner">Beginner</option>
          <option value="intermediate">Intermediate</option>
          <option value="advanced">Advanced</option>
        </select>
      )}

      <button type="submit">Update Profile</button>
    </form>
  );
}
```

### TOS Agreement Component

```jsx
// TOSAgreement.jsx
import { useState } from "react";

export default function TOSAgreement({ onAgree }) {
  const [agreed, setAgreed] = useState(false);

  const handleAgree = async () => {
    if (!agreed) return;

    try {
      const token = localStorage.getItem("access_token");
      const response = await fetch("http://localhost:3000/auth/tos/agree", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ version: "1.0.0" }),
      });

      const data = await response.json();
      if (data.success) {
        onAgree();
      }
    } catch (error) {
      console.error("TOS agreement failed:", error);
    }
  };

  return (
    <div className="tos-modal">
      <h2>Terms of Service</h2>
      <div className="tos-content">
        {/* Your TOS content here */}
        <p>By using this platform, you agree to...</p>
      </div>

      <label>
        <input
          type="checkbox"
          checked={agreed}
          onChange={(e) => setAgreed(e.target.checked)}
        />
        I agree to the Terms of Service
      </label>

      <button onClick={handleAgree} disabled={!agreed}>
        Continue
      </button>
    </div>
  );
}
```

## 🎯 Use Cases

### 1. Track-Based Features

Show content or features based on user's track:

```javascript
if (user.primary_track === "web") {
  // Show web development resources
} else if (user.primary_track === "mobile") {
  // Show mobile development resources
}
```

### 2. Student-Only Features

Restrict features to current students:

```javascript
if (
  user.student_status === "undergraduate" ||
  user.student_status === "postgraduate"
) {
  // Show student-only content
}
```

### 3. Team-Based Access

Allow access based on team membership:

```javascript
if (user.teams.includes("organizing")) {
  // Show organizing team dashboard
}
```

### 4. Skill-Level Content

Show appropriate content based on skill level:

```javascript
if (user.primary_skill_level === "beginner") {
  // Show beginner tutorials
} else if (user.primary_skill_level === "advanced") {
  // Show advanced challenges
}
```

## 🔐 Authorization Examples

### Require Specific Team

```javascript
// In your middleware
const requireTeam = (teamName) => {
  return (req, res, next) => {
    if (!req.user || !req.user.teams.includes(teamName)) {
      return res.status(403).json({
        error: `${teamName} team membership required`,
      });
    }
    next();
  };
};

// Usage
app.post(
  "/organize/event",
  authenticateToken,
  requireTeam("organizing"),
  createEvent
);
```

### Require Specific Track

```javascript
const requireTrack = (track) => {
  return (req, res, next) => {
    if (
      !req.user ||
      (req.user.primary_track !== track && req.user.secondary_track !== track)
    ) {
      return res.status(403).json({
        error: `${track} track required`,
      });
    }
    next();
  };
};

// Usage
app.post(
  "/web/workshop",
  authenticateToken,
  requireTrack("web"),
  registerWorkshop
);
```

## 📊 Analytics & Reporting

You can now generate reports like:

- Users by track (for planning workshops)
- Users by department (for departmental events)
- Users by team (for team management)
- Skill distribution (for content planning)

Example queries available via admin endpoints:

```http
GET /admin/tracks/web/users
GET /admin/teams/organizing/users
GET /admin/departments/Computer%20Science/students
```

## 🚀 Next Steps

1. **Complete your profile** with all GDG-specific fields
2. **Agree to TOS** to unlock platform features
3. **Join teams** (assigned by admins)
4. **Set your tracks** to get personalized content
5. **Update skill levels** as you progress

---

**Note:** All fields are optional except `email` and `firebase_uid`. Users can fill them gradually through the profile update endpoint.
