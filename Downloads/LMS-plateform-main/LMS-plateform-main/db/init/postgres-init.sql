-- =============================================================================
-- PostgreSQL Initialization Script — LMS Platform
--
-- Executed automatically by the postgres Docker container on first startup
-- (file is mounted at /docker-entrypoint-initdb.d/init.sql).
--
-- Tables created:
--   courses      : Course catalogue with pricing and instructor reference.
--   lessons      : Ordered lesson content belonging to a course.
--   enrollments  : Many-to-many join between users (MongoDB _id) and courses.
--   progress     : Per-user, per-lesson completion tracking.
--   reviews      : One review per user per course (rating 1–5).
--   analytics    : Append-only event log for platform analytics.
--
-- Indexes are created after table definitions to speed up common queries
-- (category filter, user/course lookups, analytics event filtering).
--
-- Seed data inserts 5 sample courses and 10 lessons for development/demo use.
-- ON CONFLICT DO NOTHING ensures re-running the script is idempotent.
-- =============================================================================

-- Courses table
CREATE TABLE IF NOT EXISTS courses (
    id SERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    instructor_id VARCHAR(255) NOT NULL,
    category VARCHAR(100),
    price DECIMAL(10, 2) DEFAULT 0.00,
    is_free BOOLEAN DEFAULT true,
    thumbnail_url TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Lessons table
CREATE TABLE IF NOT EXISTS lessons (
    id SERIAL PRIMARY KEY,
    course_id INTEGER REFERENCES courses(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    content TEXT,
    video_url TEXT,
    order_index INTEGER NOT NULL,
    duration_minutes INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Enrollments table
CREATE TABLE IF NOT EXISTS enrollments (
    id SERIAL PRIMARY KEY,
    user_id VARCHAR(255) NOT NULL,
    course_id INTEGER REFERENCES courses(id) ON DELETE CASCADE,
    enrolled_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, course_id)
);

-- Progress tracking table
CREATE TABLE IF NOT EXISTS progress (
    id SERIAL PRIMARY KEY,
    user_id VARCHAR(255) NOT NULL,
    lesson_id INTEGER REFERENCES lessons(id) ON DELETE CASCADE,
    course_id INTEGER REFERENCES courses(id) ON DELETE CASCADE,
    completed BOOLEAN DEFAULT false,
    completed_at TIMESTAMP,
    UNIQUE(user_id, lesson_id)
);

-- Reviews table
CREATE TABLE IF NOT EXISTS reviews (
    id SERIAL PRIMARY KEY,
    user_id VARCHAR(255) NOT NULL,
    course_id INTEGER REFERENCES courses(id) ON DELETE CASCADE,
    rating INTEGER CHECK (rating >= 1 AND rating <= 5),
    comment TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, course_id)
);

-- Payments table
CREATE TABLE IF NOT EXISTS payments (
    id SERIAL PRIMARY KEY,
    user_id VARCHAR(255) NOT NULL,
    course_id INTEGER REFERENCES courses(id) ON DELETE CASCADE,
    stripe_checkout_session_id VARCHAR(255) NOT NULL UNIQUE,
    stripe_payment_intent_id VARCHAR(255),
    customer_email VARCHAR(255),
    amount DECIMAL(10, 2) DEFAULT 0.00,
    currency VARCHAR(16) DEFAULT 'usd',
    status VARCHAR(64) DEFAULT 'pending',
    fulfilled_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Analytics table
CREATE TABLE IF NOT EXISTS analytics (
    id SERIAL PRIMARY KEY,
    event_type VARCHAR(50) NOT NULL,
    user_id VARCHAR(255),
    course_id INTEGER,
    lesson_id INTEGER,
    metadata JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_courses_category ON courses(category);
CREATE INDEX IF NOT EXISTS idx_courses_instructor ON courses(instructor_id);
CREATE INDEX IF NOT EXISTS idx_lessons_course ON lessons(course_id);
CREATE INDEX IF NOT EXISTS idx_enrollments_user ON enrollments(user_id);
CREATE INDEX IF NOT EXISTS idx_enrollments_course ON enrollments(course_id);
CREATE INDEX IF NOT EXISTS idx_progress_user ON progress(user_id);
CREATE INDEX IF NOT EXISTS idx_payments_user ON payments(user_id);
CREATE INDEX IF NOT EXISTS idx_payments_course ON payments(course_id);
CREATE INDEX IF NOT EXISTS idx_payments_session ON payments(stripe_checkout_session_id);
CREATE INDEX IF NOT EXISTS idx_analytics_event ON analytics(event_type);
CREATE INDEX IF NOT EXISTS idx_analytics_user ON analytics(user_id);

-- Seed data
INSERT INTO courses (title, description, instructor_id, category, price, is_free, thumbnail_url) VALUES
('Introduction to Python', 'Learn Python programming from scratch with hands-on exercises.', 'instructor_1', 'Programming', 0.00, true, '/images/python.jpg'),
('Web Development with React', 'Master React.js and build modern web applications.', 'instructor_1', 'Web Development', 29.99, false, '/images/react.jpg'),
('Data Science Fundamentals', 'Explore data analysis, visualization, and machine learning basics.', 'instructor_2', 'Data Science', 49.99, false, '/images/datascience.jpg'),
('DevOps & Cloud Computing', 'Learn Docker, Kubernetes, CI/CD, and cloud deployment.', 'instructor_2', 'DevOps', 39.99, false, '/images/devops.jpg'),
('Machine Learning A-Z', 'Comprehensive guide to machine learning algorithms and applications.', 'instructor_3', 'AI/ML', 59.99, false, '/images/ml.jpg')
ON CONFLICT DO NOTHING;

INSERT INTO lessons (course_id, title, content, video_url, order_index, duration_minutes) VALUES
(1, 'Getting Started with Python', '# Getting Started with Python

Welcome to your first Python lesson! In this lesson you will set up your development environment and write your very first program.

## Installing Python

1. Visit python.org and download the latest version
2. Run the installer — make sure to check "Add Python to PATH"
3. Open a terminal and type `python --version` to verify

## Your First Program

Open a text editor and create a file called `hello.py`:

```
print("Hello, World!")
```

Run it with:

```
python hello.py
```

Congratulations — you just wrote your first Python program!

## Key Takeaways

- Python is an interpreted language — no compilation needed
- The `print()` function outputs text to the console
- Python files use the `.py` extension', 'https://www.youtube.com/watch?v=kqtD5dpn9C8', 1, 15),

(1, 'Variables and Data Types', '# Variables and Data Types

Python has several built-in data types. Let''s explore the most common ones.

## Strings

Strings are sequences of characters wrapped in quotes:

```
name = "Alice"
greeting = ''Hello''
message = f"Welcome, {name}!"
```

## Numbers

Python supports integers and floating-point numbers:

```
age = 25
pi = 3.14159
total = age + 10
```

## Booleans

Booleans represent True or False values:

```
is_active = True
is_admin = False
```

## Type Checking

Use `type()` to check a variable''s type:

```
print(type(name))    # <class ''str''>
print(type(age))     # <class ''int''>
print(type(pi))      # <class ''float''>
```

## Practice Exercise

- Create variables for your name, age, and whether you like Python
- Print each variable with its type', 'https://www.youtube.com/watch?v=cQT33yu9pY8', 2, 20),

(1, 'Control Flow', '# Control Flow

Control flow lets your programs make decisions and repeat actions.

## If / Else Statements

```
age = 18
if age >= 18:
    print("You are an adult")
elif age >= 13:
    print("You are a teenager")
else:
    print("You are a child")
```

## For Loops

Iterate over sequences:

```
fruits = ["apple", "banana", "cherry"]
for fruit in fruits:
    print(f"I like {fruit}")
```

## While Loops

Repeat while a condition is true:

```
count = 0
while count < 5:
    print(count)
    count += 1
```

## List Comprehensions

A concise way to create lists:

```
squares = [x**2 for x in range(10)]
```', NULL, 3, 25),

(1, 'Functions', '# Functions in Python

Functions let you organize and reuse code.

## Defining a Function

```
def greet(name):
    return f"Hello, {name}!"

message = greet("Alice")
print(message)
```

## Default Parameters

```
def greet(name, greeting="Hello"):
    return f"{greeting}, {name}!"

print(greet("Bob"))
print(greet("Bob", "Hi"))
```

## Multiple Return Values

```
def divide(a, b):
    quotient = a // b
    remainder = a % b
    return quotient, remainder

q, r = divide(17, 5)
```

## Lambda Functions

Short anonymous functions:

```
square = lambda x: x ** 2
numbers = [1, 2, 3, 4, 5]
squared = list(map(square, numbers))
```', 'https://www.youtube.com/watch?v=9Os0o3wzS_I', 4, 20),

(2, 'React Fundamentals', '# React Fundamentals

React is a JavaScript library for building user interfaces using reusable components.

## What is JSX?

JSX lets you write HTML-like syntax in JavaScript:

```
function Welcome() {
  return <h1>Hello, React!</h1>;
}
```

## Components and Props

Components accept inputs called **props**:

```
function UserCard({ name, role }) {
  return (
    <div className="card">
      <h2>{name}</h2>
      <p>{role}</p>
    </div>
  );
}

// Usage
<UserCard name="Alice" role="Developer" />
```

## Component Composition

Build complex UIs by nesting components:

```
function App() {
  return (
    <div>
      <Header />
      <UserCard name="Alice" role="Developer" />
      <UserCard name="Bob" role="Designer" />
      <Footer />
    </div>
  );
}
```', 'https://www.youtube.com/watch?v=SqcY0GlETPk', 1, 30),

(2, 'State Management', '# State Management in React

State allows components to manage and respond to changing data.

## useState Hook

```
import { useState } from "react";

function Counter() {
  const [count, setCount] = useState(0);
  return (
    <div>
      <p>Count: {count}</p>
      <button onClick={() => setCount(count + 1)}>+1</button>
    </div>
  );
}
```

## useEffect Hook

Run side effects like API calls or timers:

```
import { useState, useEffect } from "react";

function UserProfile({ userId }) {
  const [user, setUser] = useState(null);

  useEffect(() => {
    fetch(`/api/users/${userId}`)
      .then(res => res.json())
      .then(data => setUser(data));
  }, [userId]);

  if (!user) return <p>Loading...</p>;
  return <h1>{user.name}</h1>;
}
```

## Best Practices

- Keep state as close to where it''s used as possible
- Lift state up when siblings need to share data
- Use `useReducer` for complex state logic', 'https://www.youtube.com/watch?v=O6P86uwfdR0', 2, 35),

(2, 'Building a Full App', '# Building a Complete React Application

Let''s put everything together and build a task management app.

## Project Structure

```
src/
  components/
    TaskList.jsx
    TaskForm.jsx
    TaskItem.jsx
  App.jsx
  index.js
```

## The Main App Component

```
function App() {
  const [tasks, setTasks] = useState([]);

  const addTask = (title) => {
    setTasks([...tasks, { id: Date.now(), title, done: false }]);
  };

  const toggleTask = (id) => {
    setTasks(tasks.map(t =>
      t.id === id ? { ...t, done: !t.done } : t
    ));
  };

  return (
    <div>
      <h1>My Tasks</h1>
      <TaskForm onAdd={addTask} />
      <TaskList tasks={tasks} onToggle={toggleTask} />
    </div>
  );
}
```

## Key Patterns Used

- **State lifting**: App owns the tasks array
- **Props drilling**: Passing handlers down to children
- **Immutable updates**: Using spread operator for state changes
- **Unique keys**: Using `Date.now()` for list item keys', NULL, 3, 45),

(3, 'Introduction to Data Science', '# Introduction to Data Science

Data science combines statistics, programming, and domain expertise to extract insights from data.

## The Data Science Workflow

1. **Define the question** — What problem are you solving?
2. **Collect data** — Gather data from APIs, databases, files
3. **Clean data** — Handle missing values, outliers, formatting
4. **Explore data** — Visualize patterns and relationships
5. **Model data** — Apply statistical or ML models
6. **Communicate** — Present findings clearly

## Essential Tools

- **Python** — The language of data science
- **Jupyter Notebooks** — Interactive coding environment
- **Pandas** — Data manipulation library
- **NumPy** — Numerical computing
- **Matplotlib / Seaborn** — Visualization
- **Scikit-learn** — Machine learning', 'https://www.youtube.com/watch?v=ua-CiDNNj30', 1, 20),

(3, 'Pandas & NumPy', '# Pandas & NumPy

## NumPy Arrays

NumPy provides fast numerical operations:

```
import numpy as np

arr = np.array([1, 2, 3, 4, 5])
print(arr.mean())    # 3.0
print(arr.std())     # 1.414

matrix = np.array([[1, 2], [3, 4]])
print(matrix.shape)  # (2, 2)
```

## Pandas DataFrames

Pandas is the backbone of data manipulation:

```
import pandas as pd

df = pd.read_csv("sales.csv")
print(df.head())
print(df.describe())
print(df.info())
```

## Filtering and Selection

```
# Select columns
names = df["name"]

# Filter rows
adults = df[df["age"] >= 18]

# Multiple conditions
senior_devs = df[(df["age"] > 30) & (df["role"] == "developer")]
```

## Grouping and Aggregation

```
revenue_by_region = df.groupby("region")["revenue"].sum()
avg_by_category = df.groupby("category").agg({"price": "mean", "quantity": "sum"})
```', NULL, 2, 40),

(3, 'Data Visualization', '# Data Visualization

## Matplotlib Basics

```
import matplotlib.pyplot as plt

x = [1, 2, 3, 4, 5]
y = [2, 4, 6, 8, 10]

plt.plot(x, y)
plt.xlabel("X Axis")
plt.ylabel("Y Axis")
plt.title("Simple Line Plot")
plt.show()
```

## Seaborn for Statistical Plots

Seaborn builds on Matplotlib with beautiful defaults:

```
import seaborn as sns

# Distribution plot
sns.histplot(data=df, x="age", bins=20)

# Scatter with regression
sns.regplot(data=df, x="hours_studied", y="score")

# Correlation heatmap
sns.heatmap(df.corr(), annot=True, cmap="coolwarm")
```

## Best Practices

- Always label your axes and add titles
- Choose the right chart type for your data
- Use color meaningfully — not just for decoration
- Keep it simple — avoid chart junk', 'https://www.youtube.com/watch?v=UO98lJQ3QGI', 3, 35)
ON CONFLICT DO NOTHING;
