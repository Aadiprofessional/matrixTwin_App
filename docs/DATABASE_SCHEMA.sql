-- MatrixTwinAPP Supabase Database Schema
-- This file contains all necessary table definitions for the app

-- ============================================
-- 1. CORE TABLES
-- ============================================

-- Users table (extends Supabase auth)
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL UNIQUE,
  avatar_url TEXT,
  role VARCHAR(50) DEFAULT 'user',
  company_id UUID,
  status VARCHAR(20) DEFAULT 'active',
  preferences JSONB DEFAULT '{}',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Companies table
CREATE TABLE IF NOT EXISTS companies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  details JSONB DEFAULT '{}',
  logo_url TEXT,
  status VARCHAR(20) DEFAULT 'active',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Projects table
CREATE TABLE IF NOT EXISTS projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  location VARCHAR(255),
  client VARCHAR(255),
  deadline DATE,
  description TEXT,
  status VARCHAR(50) DEFAULT 'planning',
  image_url TEXT,
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  created_by UUID NOT NULL REFERENCES users(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Project members table
CREATE TABLE IF NOT EXISTS project_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role VARCHAR(50) DEFAULT 'member',
  joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(project_id, user_id)
);

-- ============================================
-- 2. SITE DIARY TABLES
-- ============================================

CREATE TABLE IF NOT EXISTS site_diaries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  form_number VARCHAR(100),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  author_id UUID NOT NULL REFERENCES users(id),
  weather VARCHAR(100),
  temperature VARCHAR(50),
  work_completed TEXT,
  incidents_reported TEXT,
  materials_delivered TEXT,
  notes TEXT,
  form_data JSONB,
  status VARCHAR(50) DEFAULT 'draft',
  current_node_index INTEGER DEFAULT 0,
  current_active_node VARCHAR(100),
  expires_at TIMESTAMP,
  active BOOLEAN DEFAULT TRUE,
  created_by UUID NOT NULL REFERENCES users(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS diary_workflow_nodes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  diary_id UUID NOT NULL REFERENCES site_diaries(id) ON DELETE CASCADE,
  node_order INTEGER NOT NULL,
  node_name VARCHAR(255) NOT NULL,
  node_type VARCHAR(50),
  executor_id UUID,
  executor_name VARCHAR(255),
  status VARCHAR(50) DEFAULT 'pending',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS diary_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  diary_id UUID NOT NULL REFERENCES site_diaries(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id),
  role VARCHAR(50),
  assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS diary_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  diary_id UUID NOT NULL REFERENCES site_diaries(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id),
  user_name VARCHAR(255),
  comment TEXT NOT NULL,
  action VARCHAR(50),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS diary_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  diary_id UUID NOT NULL REFERENCES site_diaries(id) ON DELETE CASCADE,
  form_data JSONB,
  status VARCHAR(50),
  changed_by UUID REFERENCES users(id),
  changed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- 3. SAFETY INSPECTION TABLES
-- ============================================

CREATE TABLE IF NOT EXISTS safety_inspections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  form_number VARCHAR(100),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  inspector_id UUID NOT NULL REFERENCES users(id),
  location VARCHAR(255),
  inspection_type VARCHAR(100),
  findings TEXT,
  corrective_actions TEXT,
  risk_level VARCHAR(50),
  safety_score DECIMAL(5,2),
  findings_count INTEGER DEFAULT 0,
  checklist_items JSONB,
  status VARCHAR(50) DEFAULT 'draft',
  current_node_index INTEGER DEFAULT 0,
  current_active_node VARCHAR(100),
  expires_at TIMESTAMP,
  active BOOLEAN DEFAULT TRUE,
  created_by UUID NOT NULL REFERENCES users(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS safety_workflow_nodes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  safety_id UUID NOT NULL REFERENCES safety_inspections(id) ON DELETE CASCADE,
  node_order INTEGER NOT NULL,
  node_name VARCHAR(255) NOT NULL,
  executor_id UUID,
  executor_name VARCHAR(255),
  status VARCHAR(50) DEFAULT 'pending',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- 4. LABOUR RETURN TABLES
-- ============================================

CREATE TABLE IF NOT EXISTS labour_returns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  form_number VARCHAR(100),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  supervisor_id UUID NOT NULL REFERENCES users(id),
  trade VARCHAR(100),
  workers_count INTEGER,
  hours_worked DECIMAL(10,2),
  tasks_completed TEXT,
  labour_data JSONB,
  notes TEXT,
  status VARCHAR(50) DEFAULT 'draft',
  current_node_index INTEGER DEFAULT 0,
  expires_at TIMESTAMP,
  active BOOLEAN DEFAULT TRUE,
  created_by UUID NOT NULL REFERENCES users(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS monthly_labour_returns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  month INTEGER NOT NULL,
  year INTEGER NOT NULL,
  total_workers INTEGER,
  total_hours DECIMAL(10,2),
  trades JSONB,
  status VARCHAR(50) DEFAULT 'draft',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(project_id, month, year)
);

-- ============================================
-- 5. RFI/RICS TABLES
-- ============================================

CREATE TABLE IF NOT EXISTS rfis (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  form_number VARCHAR(100),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  subject VARCHAR(255) NOT NULL,
  description TEXT,
  priority VARCHAR(50),
  raised_by_id UUID NOT NULL REFERENCES users(id),
  assigned_to_id UUID REFERENCES users(id),
  response TEXT,
  response_date DATE,
  due_date DATE,
  attachments JSONB,
  status VARCHAR(50) DEFAULT 'open',
  current_node_index INTEGER DEFAULT 0,
  expires_at TIMESTAMP,
  active BOOLEAN DEFAULT TRUE,
  created_by UUID NOT NULL REFERENCES users(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- 6. CLEANSING TABLES
-- ============================================

CREATE TABLE IF NOT EXISTS cleansing_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  form_number VARCHAR(100),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  area VARCHAR(255),
  cleaning_type VARCHAR(100),
  performed_by_id UUID NOT NULL REFERENCES users(id),
  materials_used TEXT,
  notes TEXT,
  status VARCHAR(50) DEFAULT 'draft',
  current_node_index INTEGER DEFAULT 0,
  expires_at TIMESTAMP,
  active BOOLEAN DEFAULT TRUE,
  created_by UUID NOT NULL REFERENCES users(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- 7. CUSTOM FORMS TABLES
-- ============================================

CREATE TABLE IF NOT EXISTS form_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  form_structure JSONB,
  process_nodes JSONB,
  created_by UUID NOT NULL REFERENCES users(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS form_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID NOT NULL REFERENCES form_templates(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  form_data JSONB,
  status VARCHAR(50) DEFAULT 'draft',
  current_node_index INTEGER DEFAULT 0,
  current_active_node VARCHAR(100),
  created_by UUID NOT NULL REFERENCES users(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- 8. DIGITAL TWINS TABLES
-- ============================================

CREATE TABLE IF NOT EXISTS digital_twin_models (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  file_url TEXT NOT NULL,
  file_name VARCHAR(255),
  file_size BIGINT,
  file_type VARCHAR(50),
  viewer_url TEXT,
  viewer_token TEXT,
  cover_image_url TEXT,
  status VARCHAR(50) DEFAULT 'processing',
  uploaded_by_id UUID NOT NULL REFERENCES users(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS model_annotations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  model_id UUID NOT NULL REFERENCES digital_twin_models(id) ON DELETE CASCADE,
  annotation_type VARCHAR(50),
  position JSONB,
  content TEXT,
  created_by_id UUID NOT NULL REFERENCES users(id),
  resolved_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- 9. IoT TABLES
-- ============================================

CREATE TABLE IF NOT EXISTS iot_sensors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  sensor_type VARCHAR(50),
  location VARCHAR(255),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  status VARCHAR(50) DEFAULT 'active',
  last_reading DECIMAL(10,2),
  last_reading_time TIMESTAMP,
  unit VARCHAR(50),
  battery_level INTEGER,
  serial_number VARCHAR(100),
  install_date DATE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS sensor_readings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sensor_id UUID NOT NULL REFERENCES iot_sensors(id) ON DELETE CASCADE,
  value DECIMAL(10,2) NOT NULL,
  unit VARCHAR(50),
  quality VARCHAR(20),
  timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- 10. NOTIFICATIONS TABLES
-- ============================================

CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  notification_type VARCHAR(50),
  title VARCHAR(255),
  message TEXT,
  data JSONB,
  read BOOLEAN DEFAULT FALSE,
  read_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- 11. AUDIT & SETTINGS TABLES
-- ============================================

CREATE TABLE IF NOT EXISTS user_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  theme VARCHAR(20) DEFAULT 'light',
  language VARCHAR(10) DEFAULT 'en',
  timezone VARCHAR(50),
  notifications_enabled BOOLEAN DEFAULT TRUE,
  email_notifications BOOLEAN DEFAULT TRUE,
  push_notifications BOOLEAN DEFAULT TRUE,
  digest_frequency VARCHAR(20) DEFAULT 'daily',
  auto_sync BOOLEAN DEFAULT TRUE,
  sync_interval INTEGER DEFAULT 300,
  default_project_id UUID,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id),
  action VARCHAR(100),
  resource_type VARCHAR(50),
  resource_id UUID,
  changes JSONB,
  ip_address INET,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- INDEXES
-- ============================================

CREATE INDEX idx_projects_company_id ON projects(company_id);
CREATE INDEX idx_projects_created_by ON projects(created_by);
CREATE INDEX idx_project_members_user_id ON project_members(user_id);
CREATE INDEX idx_site_diaries_project_id ON site_diaries(project_id);
CREATE INDEX idx_site_diaries_date ON site_diaries(date);
CREATE INDEX idx_site_diaries_status ON site_diaries(status);
CREATE INDEX idx_safety_inspections_project_id ON safety_inspections(project_id);
CREATE INDEX idx_safety_inspections_date ON safety_inspections(date);
CREATE INDEX idx_labour_returns_project_id ON labour_returns(project_id);
CREATE INDEX idx_labour_returns_date ON labour_returns(date);
CREATE INDEX idx_rfis_project_id ON rfis(project_id);
CREATE INDEX idx_rfis_status ON rfis(status);
CREATE INDEX idx_cleansing_project_id ON cleansing_records(project_id);
CREATE INDEX idx_digital_twin_models_project_id ON digital_twin_models(project_id);
CREATE INDEX idx_iot_sensors_project_id ON iot_sensors(project_id);
CREATE INDEX idx_notifications_user_id ON notifications(user_id);
CREATE INDEX idx_notifications_read ON notifications(read);
CREATE INDEX idx_user_settings_user_id ON user_settings(user_id);
