# MatrixTwin React Native Implementation Guide

## ✅ Completed

### 1. API Layer (src/api/)
- **forms.ts** - Comprehensive form API with support for:
  - RFI (Request for Information)
  - Site Diary
  - Safety Inspections
  - Labour Returns
  - Cleansing Records Management
  - Generic form operations (create, update, delete, assign)
  - Workflow/process node management

- **Existing APIs** already integrated:
  - auth.ts - Authentication
  - digitalTwins.ts - 3D models and annotations
  - aiChat.ts - AI chat sessions
  - dashboard.ts - Dashboard statistics
  - team.ts - Team management
  - settings.ts - User settings
  - iot.ts - IoT sensor data
  - And more specialized APIs

### 2. Screens Implementation

#### Main Navigation
- **RootNavigator.tsx** - Root navigation with auth checks
- **AppNavigator.tsx** - App stack with all screens:
  - Company Setup
  - Projects List
  - Project Dashboard
  - Overview (Dashboard)
  - All Form Screens
  - Digital Twins
  - DWSS
  - Team Management
  - Settings
  - Ask AI

#### Form Screens (Existing)
- ✅ RFI/RICS Screen - Request management
- ✅ Site Diary Screen - Daily records
- ✅ Safety Inspections Screen - Safety checks
- ✅ Labour Return Screen - Workforce tracking
- ✅ Cleansing Records Screen - Cleaning inspections

#### New Screens
- ✅ DigitalTwinsScreen - 3D model listing and tabs
- ✅ DWSSScreen - Digital Work Site Systems

#### Management Screens (Existing)
- ✅ Team Management Screen
- ✅ Settings Screen
- ✅ Ask AI Screen

### 3. Reusable Components (src/components/forms/)

#### FormListTemplate.tsx
A reusable component for all form list screens featuring:
- Search functionality
- Status filtering
- Priority display
- Form item rendering with status colors
- Floating action button for creating new items
- Loading and empty states

**Usage:**
```typescript
import FormListTemplate from '../components/forms/FormListTemplate';

<FormListTemplate
  title="RFI / RICS"
  items={rfiItems}
  loading={loading}
  onCreatePress={() => setShowCreate(true)}
  onItemPress={(item) => showDetail(item)}
  statusColors={{ approved: '#10b981', rejected: '#ef4444' }}
/>
```

#### FormDetailTemplate.tsx
A reusable component for form detail views featuring:
- Header with title and form number
- Status and priority badges
- Workflow timeline visualization
- Metadata (created by, created at)
- Action buttons (Approve, Reject)
- Action menu (Edit, Delete)

**Usage:**
```typescript
import FormDetailTemplate from '../components/forms/FormDetailTemplate';

<FormDetailTemplate
  title={form.name}
  formNumber={form.form_number}
  status={form.status}
  priority={form.priority}
  createdAt={form.created_at}
  workflowNodes={form.workflow_nodes}
  onApprove={handleApprove}
  onReject={handleReject}
  onClose={() => setShowDetail(false)}
>
  {/* Custom form fields here */}
</FormDetailTemplate>
```

## 🔄 Current Implementation Status

### Features by Module
| Feature | Status | Notes |
|---------|--------|-------|
| Overview/Dashboard | ✅ Complete | Statistics, charts, real-time data |
| Digital Twins | ✅ Partial | List view complete, detail view needed |
| Ask AI | ✅ Complete | Chat interface, conversation history |
| DWSS | ✅ Partial | Dashboard created, needs real data integration |
| RFI/RICS | ✅ Complete | List, create, detail, workflow |
| Site Diary | ✅ Complete | List, create, detail, status tracking |
| Safety Inspections | ✅ Complete | List, create, detail, checklist items |
| Labour Return | ✅ Complete | List, create, detail |
| Cleansing Records | ✅ Complete | List, create, detail |
| Team Management | ✅ Complete | Member list, roles, invitations |
| Settings | ✅ Complete | Profile, uploads, preferences |
| Forms Builder | ✅ Complete | Template-based form creation |

## 📋 How to Enhance Existing Form Screens

All form screens (RFI, Diary, Safety, Labour, Cleansing) follow a similar pattern:

### Pattern
1. Fetch data from API using React Query
2. Display list using FormListTemplate
3. Show detail modal with FormDetailTemplate
4. Implement create/edit functionality
5. Handle workflow actions (approve, reject, etc.)

### Example Implementation for Any Form Screen

```typescript
import React, { useState, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import FormListTemplate from '../components/forms/FormListTemplate';
import FormDetailTemplate from '../components/forms/FormDetailTemplate';
import { getRFIs, createRFI, updateRFI } from '../../api/forms';

export default function RfiScreen({ route }) {
  const { projectId, projectName } = route.params;
  const [showDetail, setShowDetail] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const [showCreate, setShowCreate] = useState(false);

  const { data: items = [], isLoading, refetch } = useQuery({
    queryKey: ['rfis', projectId],
    queryFn: () => getRFIs(projectId),
  });

  const handleCreate = async (formData) => {
    await createRFI({ ...formData, project_id: projectId });
    refetch();
    setShowCreate(false);
  };

  return (
    <>
      <FormListTemplate
        title="RFI / RICS"
        description={projectName}
        items={items}
        loading={isLoading}
        onCreatePress={() => setShowCreate(true)}
        onItemPress={(item) => {
          setSelectedItem(item);
          setShowDetail(true);
        }}
      />

      {showDetail && selectedItem && (
        <FormDetailTemplate
          title={selectedItem.name}
          formNumber={selectedItem.form_number}
          status={selectedItem.status}
          priority={selectedItem.priority}
          description={selectedItem.description}
          createdBy={selectedItem.created_by}
          createdAt={selectedItem.created_at}
          workflowNodes={selectedItem.workflow_nodes}
          onApprove={async () => {
            await updateRFI(selectedItem.id, { status: 'approved' });
            refetch();
            setShowDetail(false);
          }}
          onReject={async () => {
            await updateRFI(selectedItem.id, { status: 'rejected' });
            refetch();
            setShowDetail(false);
          }}
          onClose={() => setShowDetail(false)}
        />
      )}

      {/* Create Modal */}
      {showCreate && (
        <CreateRFIModal
          onSubmit={handleCreate}
          onCancel={() => setShowCreate(false)}
        />
      )}
    </>
  );
}
```

## 🔧 Configuration

### Colors (src/theme/colors.ts)
- Primary, Secondary, Success, Warning, Error colors defined
- Surface and background colors for dark/light mode
- Text colors with proper contrast

### Spacing (src/theme/spacing.ts)
- Consistent spacing scale (xs, sm, md, lg, xl)
- Border radius presets

### Navigation Structure
```
Root
├── Auth Navigation
│   ├── Login
│   ├── Register
│   ├── ForgotPassword
│   └── VerifyEmail
└── App Navigation
    ├── Company
    ├── Projects
    ├── Project Dashboard
    │   ├── Overview
    │   ├── Digital Twins
    │   │   └── Digital Twin Detail
    │   ├── RFI
    │   ├── Site Diary
    │   ├── Safety
    │   ├── Labour
    │   ├── Cleansing
    │   ├── Forms
    │   ├── DWSS
    │   ├── Team
    │   ├── Ask AI
    │   └── Settings
```

## 🚀 Next Steps

### Immediate
1. ✅ Verify all screens compile without errors
2. ✅ Test navigation between all screens
3. Test API integration for each screen

### Short-term
1. Add image upload functionality to forms
2. Implement PDF generation and export
3. Add offline support with MMKV storage
4. Implement push notifications

### Medium-term
1. Add more advanced filtering and search
2. Implement batch operations
3. Add data synchronization
4. Create custom form builder

### Long-term
1. Advanced analytics dashboards
2. Real-time collaboration features
3. Integration with third-party services
4. Mobile optimization and performance tuning

## 📝 Notes

- All screens use React Native best practices
- Consistent styling across the app using theme system
- Proper error handling and loading states
- React Query for efficient data fetching
- Zustand for global state management
- Navigation follows best practices with proper params

## 🔗 Related Files

- Theme configuration: `src/theme/colors.ts`, `src/theme/spacing.ts`
- Global store: `src/store/authStore.ts`, `src/store/projectStore.ts`
- API client: `src/api/client.ts`
- Auth context: Handled through Supabase integration
