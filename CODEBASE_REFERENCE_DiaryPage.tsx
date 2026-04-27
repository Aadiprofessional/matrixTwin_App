import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js';
import { exportReportElementToSinglePagePdf } from '../utils/pdfUtils';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Dialog } from '../components/ui/Dialog';
import { ReportModal } from '../components/common/ReportModal';
import { FullReportContent } from '../components/common/FullReportContent';
import { useAuth } from '../contexts/AuthContext';
import { useProjects } from '../contexts/ProjectContext';
import { projectService } from '../services/projectService';
import * as RiIcons from 'react-icons/ri';
import { SiteDiaryFormTemplate } from '../components/forms/SiteDiaryFormTemplate';
import ProcessFlowBuilder from '../components/forms/ProcessFlowBuilder';
import { PeopleSelectorModal } from '../components/ui/PeopleSelectorModal';
import { useFeedback } from '../contexts/FeedbackContext';

// Add interfaces for process flow
interface ProcessNode {
  id: string;
  type: 'start' | 'node' | 'end';
  name: string;
  executor?: string; // Keep as string for compatibility
  executorId?: string; // Add executor ID for backend
  ccRecipients?: User[]; // Add node-specific CC recipients
  editAccess?: boolean; // Add edit access flag
  expireTime?: string; // Add expire time field - can be 'unlimited' or ISO datetime string
  expireDuration?: number | null; // Add expire duration in hours (null = unlimited)
  settings: Record<string, any>;
}

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  avatar?: string;
}

interface DiaryEntry {
  id: string;
  form_number?: string;
  formNumber?: string;
  form_no?: string;
  formNo?: string;
  date: string;
  project: string;
  name?: string;
  project_id?: string;
  author: string;
  weather: string;
  temperature: string;
  work_completed: string;
  incidents_reported: string;
  materials_delivered: string;
  notes: string;
  form_data?: any;
  status: string;
  current_node_index: number;
  current_active_node?: string; // Add current active node tracking
  diary_workflow_nodes?: any[];
  diary_assignments?: any[];
  diary_comments?: any[];
  created_by: string;
  created_at: string;
  updated_at?: string;
  expires_at?: string;
  expiresAt?: string;
  active?: boolean;
}

interface HistoryEntry {
  id: string;
  changed_at: string;
  form_data: any;
  users?: {
    name: string;
    email: string;
  };
}

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

const DiaryPage: React.FC = () => {
  const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'https://server.matrixtwin.com';
  const { t } = useTranslation();
  const { showToast, showConfirm, showPrompt } = useFeedback();
  const { user } = useAuth();
  const { selectedProject } = useProjects();
  const location = useLocation();
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'completed' | 'rejected' | 'permanently_rejected'>('all');
  const [sortBy, setSortBy] = useState<'newest' | 'oldest'>('newest');
  const [showNewEntry, setShowNewEntry] = useState(false);
  const [selectedDiaryEntry, setSelectedDiaryEntry] = useState<DiaryEntry | null>(null);
  const [showDetails, setShowDetails] = useState(false);
  const [showFormView, setShowFormView] = useState(false);
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState<User[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  
  // Process flow states
  const [showProcessFlow, setShowProcessFlow] = useState(false);
  const [pendingFormData, setPendingFormData] = useState<any>(null);
  const [pendingDiaryName, setPendingDiaryName] = useState('');
  const [pendingDiaryExpiry, setPendingDiaryExpiry] = useState('');
  const [processNodes, setProcessNodes] = useState<ProcessNode[]>([
    { id: 'start', type: 'start', name: 'Start', editAccess: true, settings: {} },
    { id: 'review', type: 'node', name: 'Review & Approval', editAccess: true, ccRecipients: [], settings: {} },
    { id: 'end', type: 'end', name: 'Complete', editAccess: false, settings: {} }
  ]);
  const [selectedNode, setSelectedNode] = useState<ProcessNode | null>(null);
  const [showPeopleSelector, setShowPeopleSelector] = useState(false);
  const [peopleSelectorType, setPeopleSelectorType] = useState<'executor' | 'cc'>('executor');
  
  // Diary entries from API
  const [diaryEntries, setDiaryEntries] = useState<DiaryEntry[]>([]);

  // History states
  const [showHistory, setShowHistory] = useState(false);
  const [historyData, setHistoryData] = useState<HistoryEntry[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [showHistoryForm, setShowHistoryForm] = useState(false);
  const [selectedHistoryEntry, setSelectedHistoryEntry] = useState<HistoryEntry | null>(null);
  const [showReport, setShowReport] = useState(false);
  const [isDownloadingReport, setIsDownloadingReport] = useState(false);
  const [expiryDrafts, setExpiryDrafts] = useState<Record<string, string>>({});
  const [savingExpiry, setSavingExpiry] = useState<Record<string, boolean>>({});
  const [updatingExpiryStatus, setUpdatingExpiryStatus] = useState<Record<string, boolean>>({});
  const [renamingDiary, setRenamingDiary] = useState<Record<string, boolean>>({});
  const [sendingNodeReminder, setSendingNodeReminder] = useState<Record<string, boolean>>({});
  const reportContentRef = useRef<HTMLDivElement>(null);

  const formatDateTimeLocal = (date: Date) => {
    const localDate = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
    return localDate.toISOString().slice(0, 16);
  };

  const getDefaultExpiryDate = (entry: DiaryEntry) => {
    const baseDate = new Date(entry.created_at || entry.date);
    const resolvedBaseDate = Number.isNaN(baseDate.getTime()) ? new Date() : baseDate;
    const defaultExpiryDate = new Date(resolvedBaseDate);
    defaultExpiryDate.setDate(defaultExpiryDate.getDate() + 10);
    return defaultExpiryDate;
  };

  const getEntryExpiryDate = (entry: DiaryEntry) => {
    const expirySource = entry.expires_at || entry.expiresAt;
    const parsedExpiry = expirySource ? new Date(expirySource) : getDefaultExpiryDate(entry);
    return Number.isNaN(parsedExpiry.getTime()) ? getDefaultExpiryDate(entry) : parsedExpiry;
  };

  const isEntryExpired = (entry: DiaryEntry) => {
    return entry.active === false || getEntryExpiryDate(entry).getTime() <= Date.now();
  };

  const getDiaryDisplayName = (entry: DiaryEntry) => {
    const preferredName = (entry.name || entry.project || '').trim();
    if (!preferredName || preferredName.toLowerCase() === 'unknown project') {
      return 'New Diary';
    }
    return preferredName;
  };

  const getDiaryFormNo = (entry: DiaryEntry) => {
    const rawValue =
      entry.form_number ||
      entry.formNumber ||
      entry.form_no ||
      entry.formNo ||
      entry.form_data?.form_number ||
      entry.form_data?.formNumber ||
      entry.form_data?.form_no ||
      entry.form_data?.formNo ||
      entry.id;
    return rawValue ? String(rawValue).trim() : '-';
  };

  const getExpirySummary = (entry: DiaryEntry) => {
    const expiryDate = getEntryExpiryDate(entry);
    const now = new Date();
    const msLeft = expiryDate.getTime() - now.getTime();
    const daysLeft = Math.ceil(msLeft / (1000 * 60 * 60 * 24));

    if (isEntryExpired(entry)) {
      const daysOverdue = Math.max(1, Math.abs(daysLeft));
      return {
        text: `Expired ${daysOverdue} day${daysOverdue === 1 ? '' : 's'} ago`,
        className: 'bg-[#dbe5c4] text-[#526728] dark:bg-[#2f3a17]/40 dark:text-[#a4b986]'
      };
    }

    return {
      text: `Expires in ${daysLeft} day${daysLeft === 1 ? '' : 's'}`,
      className: 'bg-[#e2ebcf] text-[#526728] dark:bg-[#2f3a17]/40 dark:text-[#b0c985]'
    };
  };

  // Fetch diary entries from API with project filtering
  const fetchDiaryEntries = useCallback(async () => {
    if (!user) return;

    try {
      setLoading(true);
      const projectParam = selectedProject?.id ? `?projectId=${selectedProject.id}` : '';
      const response = await fetch(`https://server.matrixtwin.com/api/diary/list/${user.id}${projectParam}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setDiaryEntries(data);
      } else {
        console.error('Failed to fetch diary entries');
      }
    } catch (error) {
      console.error('Error fetching diary entries:', error);
    } finally {
      setLoading(false);
    }
  }, [user, selectedProject?.id]);

  // Fetch users from API (using project members)
  const fetchUsers = useCallback(async () => {
    if (!selectedProject?.id) return;
    
    try {
      setLoadingUsers(true);
      // Use projectService to fetch project members
      const members = await projectService.getProjectMembers(selectedProject.id);
      
      // Map ProjectMember to User interface
      const mappedUsers: User[] = members.map(member => ({
        id: member.user.id,
        name: member.user.name,
        email: member.user.email,
        role: member.role,
        avatar: member.user.avatar
      }));
      
      setUsers(mappedUsers);
    } catch (error) {
      console.error('Error fetching project members:', error);
      // Fallback to current user if fetch fails
      if (user) {
        setUsers([{
          id: user.id,
          name: user.name || 'Current User',
          email: user.email || 'user@example.com',
          role: user.role || 'admin'
        }]);
      }
    } finally {
      setLoadingUsers(false);
    }
  }, [selectedProject?.id, user]);

  // Fetch diary entries on component mount and when project changes
  useEffect(() => {
    if (user?.id) {
      fetchDiaryEntries();
      fetchUsers();
    }
  }, [user?.id, selectedProject?.id, fetchDiaryEntries, fetchUsers]);

  useEffect(() => {
    if (diaryEntries.length === 0) return;

    setExpiryDrafts((prev) => {
      const next = { ...prev };
      diaryEntries.forEach((entry) => {
        if (!next[entry.id]) {
          const expirySource = entry.expires_at || entry.expiresAt;
          const expiryDate = expirySource ? new Date(expirySource) : getDefaultExpiryDate(entry);
          next[entry.id] = formatDateTimeLocal(expiryDate);
        }
      });
      return next;
    });
  }, [diaryEntries]);

  // Handle URL query parameters for direct navigation
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const id = params.get('id');
    if (id && diaryEntries.length > 0) {
      const entry = diaryEntries.find(e => e.id === id);
      if (entry) {
        setSelectedDiaryEntry(entry);
        setShowDetails(true);
        // Also show form view if needed, but standard view is details modal
      }
    }
  }, [location.search, diaryEntries]);
  
  const filteredEntries = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    const baseFiltered = diaryEntries.filter(entry => {
      const matchesSearch = !query ||
        getDiaryDisplayName(entry).toLowerCase().includes(query) ||
        entry.author.toLowerCase().includes(query) ||
        entry.work_completed.toLowerCase().includes(query) ||
        entry.date.includes(query);
      const matchesStatus = statusFilter === 'all' || entry.status === statusFilter;
      return matchesSearch && matchesStatus;
    });

    return [...baseFiltered].sort((a, b) => {
      const aTime = new Date(a.date).getTime();
      const bTime = new Date(b.date).getTime();
      if (Number.isNaN(aTime) || Number.isNaN(bTime)) {
        return sortBy === 'newest'
          ? b.date.localeCompare(a.date)
          : a.date.localeCompare(b.date);
      }
      return sortBy === 'newest' ? bTime - aTime : aTime - bTime;
    });
  }, [diaryEntries, searchQuery, statusFilter, sortBy]);
  
  // Process flow helper functions
  const addNewNode = () => {
    const newNode: ProcessNode = {
      id: `node_${Date.now()}`,
      type: 'node',
      name: 'New Process Step',
      settings: {}
    };
    
    // Insert before the end node
    const endNodeIndex = processNodes.findIndex(node => node.type === 'end');
    const updatedNodes = [...processNodes];
    updatedNodes.splice(endNodeIndex, 0, newNode);
    setProcessNodes(updatedNodes);
    setSelectedNode(newNode);
  };
  
  const openPeopleSelector = (type: 'executor' | 'cc') => {
    setPeopleSelectorType(type);
    setShowPeopleSelector(true);
  };
  
  const handleUserSelection = (selectedUser: User) => {
    if (peopleSelectorType === 'executor' && selectedNode) {
      const updatedNode = { 
        ...selectedNode, 
        executor: selectedUser.name,
        executorId: selectedUser.id // Store executor ID for backend
      };
      const updatedNodes = processNodes.map(node => 
        node.id === selectedNode.id ? updatedNode : node
      );
      setProcessNodes(updatedNodes);
      setSelectedNode(updatedNode);
    } else if (peopleSelectorType === 'cc' && selectedNode) {
      // Add to node-specific CC recipients instead of global
      const currentCcs = selectedNode.ccRecipients || [];
      if (!currentCcs.find(cc => cc.id === selectedUser.id)) {
        const updatedNode = {
          ...selectedNode,
          ccRecipients: [...currentCcs, selectedUser]
        };
        const updatedNodes = processNodes.map(node => 
          node.id === selectedNode.id ? updatedNode : node
        );
        setProcessNodes(updatedNodes);
        setSelectedNode(updatedNode);
      }
    }
  };
  
  const removeUserFromCc = (userId: string) => {
    if (selectedNode) {
      const updatedCcs = (selectedNode.ccRecipients || []).filter(cc => cc.id !== userId);
      const updatedNode = {
        ...selectedNode,
        ccRecipients: updatedCcs
      };
      const updatedNodes = processNodes.map(node => 
        node.id === selectedNode.id ? updatedNode : node
      );
      setProcessNodes(updatedNodes);
      setSelectedNode(updatedNode);
    }
  };
  
  // Create new diary entry - now shows process flow first
  const handleCreateEntry = (formData: any) => {
    const sourceDate = formData?.date ? new Date(formData.date) : new Date();
    const resolvedDate = Number.isNaN(sourceDate.getTime()) ? new Date() : sourceDate;
    const formattedDate = resolvedDate.toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short'
    });
    const defaultName = `Diary - ${selectedProject?.name || 'Project'} - ${formattedDate}`;
    const defaultExpiry = new Date();
    defaultExpiry.setDate(defaultExpiry.getDate() + 10);

    setPendingFormData(formData);
    setPendingDiaryName(defaultName);
    setPendingDiaryExpiry(formatDateTimeLocal(defaultExpiry));
    setShowNewEntry(false);
    setShowProcessFlow(true);
    setSelectedNode(processNodes.find(node => node.type === 'node') || null);
  };
  
  // Final save after process flow configuration
  const handleFinalSave = async () => {
    if (!pendingFormData || !user?.id) return;

    const diaryName = pendingDiaryName.trim();
    if (!diaryName) {
      showToast('Please provide a diary name.');
      return;
    }

    if (!pendingDiaryExpiry) {
      showToast('Please select an expiry date and time.');
      return;
    }

    const parsedExpiry = new Date(pendingDiaryExpiry);
    if (Number.isNaN(parsedExpiry.getTime())) {
      showToast('Please select a valid expiry date and time.');
      return;
    }
    
    try {
      // Prepare process nodes with proper structure for backend
      const processNodesForBackend = processNodes.map(node => ({
        ...node,
        executorId: node.executorId, // Send executor ID
        executorName: node.executor, // Send executor name
        ccRecipients: node.ccRecipients || [], // Send node-specific CCs
        editAccess: node.editAccess !== false // Default to true if not set
      }));

      console.log('Sending diary entry data:', {
        formData: pendingFormData,
        processNodes: processNodesForBackend,
        createdBy: user.id,
        projectId: selectedProject?.id,
        formId: pendingFormData.formNumber,
        name: diaryName,
        expiresAt: parsedExpiry.toISOString()
      });

      const response = await fetch(`${process.env.REACT_APP_API_BASE_URL}/api/diary/create`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          formData: pendingFormData,
          processNodes: processNodesForBackend,
          createdBy: user.id,
          projectId: selectedProject?.id,
          formId: pendingFormData.formNumber,
          name: diaryName,
          expiresAt: parsedExpiry.toISOString()
        })
      });

      if (response.ok) {
        const result = await response.json();
        console.log('Diary entry created successfully:', result);
        
        // Refresh diary entries
        await fetchDiaryEntries();
        
        // Reset states
        setShowProcessFlow(false);
        setPendingFormData(null);
        setPendingDiaryName('');
        setPendingDiaryExpiry('');
        setSelectedNode(null);
        
        // Reset process nodes to default
        setProcessNodes([
          { id: 'start', type: 'start', name: 'Start', editAccess: true, settings: {} },
          { id: 'review', type: 'node', name: 'Review & Approval', editAccess: true, ccRecipients: [], settings: {} },
          { id: 'end', type: 'end', name: 'Complete', editAccess: false, settings: {} }
        ]);
        
        // Show success message
        showToast('Diary entry created successfully! Notifications have been sent to assigned users.');
      } else {
        const error = await response.json();
        console.error('Failed to create diary entry:', error);
        showToast(`Failed to create diary entry: ${error.error}`);
      }
    } catch (error) {
      console.error('Error creating diary entry:', error);
      showToast('Failed to create diary entry. Please try again.');
    }
  };
  
  // Cancel process flow and go back to form
  const handleCancelProcessFlow = () => {
    setShowProcessFlow(false);
    setShowNewEntry(true);
    setPendingFormData(null);
    setPendingDiaryName('');
    setPendingDiaryExpiry('');
  };
  
  // Fetch history for a diary entry
  const fetchHistory = async (diaryId: string) => {
    try {
      setLoadingHistory(true);
      const response = await fetch(`https://server.matrixtwin.com/api/diary/${diaryId}/history`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setHistoryData(data);
      } else {
        console.error('Failed to fetch history');
        setHistoryData([]);
      }
    } catch (error) {
      console.error('Error fetching history:', error);
      setHistoryData([]);
    } finally {
      setLoadingHistory(false);
    }
  };

  // Restore history version
  const handleRestore = async (history: HistoryEntry) => {
    if (!selectedDiaryEntry) return;
    
    if (!(await showConfirm('Are you sure you want to restore this version? This will create a new history entry with the current state.'))) {
      return;
    }

    try {
      const response = await fetch(`https://server.matrixtwin.com/api/diary/${selectedDiaryEntry.id}/restore`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ historyId: history.id })
      });

      if (response.ok) {
        showToast('Diary entry restored successfully!');
        setShowHistory(false);
        fetchDiaryEntries();
        setSelectedDiaryEntry(null);
        setShowDetails(false);
      } else {
        const error = await response.json();
        showToast(`Failed to restore diary entry: ${error.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Error restoring diary entry:', error);
      showToast('Failed to restore diary entry. Please try again.');
    }
  };

  // View entry history
  const handleViewHistory = async (entry: DiaryEntry) => {
    setSelectedDiaryEntry(entry);
    setShowHistory(true);
    await fetchHistory(entry.id);
  };

  // View entry details
  const handleViewDetails = async (entry: DiaryEntry) => {
    try {
      // Fetch full entry details including workflow and comments
      const response = await fetch(`https://server.matrixtwin.com/api/diary/${entry.id}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      if (response.ok) {
        const fullEntry = await response.json();
        setSelectedDiaryEntry(fullEntry);
        setShowDetails(true);
      } else {
        setSelectedDiaryEntry(entry);
        setShowDetails(true);
      }
    } catch (error) {
      console.error('Error fetching entry details:', error);
      setSelectedDiaryEntry(entry);
      setShowDetails(true);
    }
  };

  // Handle workflow actions (approve/reject/back to previous)
  const handleWorkflowAction = async (action: 'approve' | 'reject' | 'back') => {
    if (!selectedDiaryEntry || !user?.id) return;

    let comment = '';
    if (action === 'reject' || action === 'back') {
      const promptResult = await showPrompt({
        title: action === 'reject' ? 'Reason Required' : 'Comment Required',
        message: `Please provide a ${action === 'reject' ? 'reason for rejection' : 'comment for sending back'}:`,
        placeholder: action === 'reject' ? 'Enter rejection reason' : 'Enter send-back comment',
        confirmLabel: 'Submit'
      });
      if (promptResult === null || promptResult.trim() === '') {
        showToast(`A comment is required when ${action === 'reject' ? 'rejecting' : 'sending back'} an entry.`);
        return;
      }
      comment = promptResult.trim();
    }

    try {
      const response = await fetch(`https://server.matrixtwin.com/api/diary/${selectedDiaryEntry.id}/update`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          action: action,
          comment: comment,
          userId: user.id
        })
      });

      if (response.ok) {
        const result = await response.json();
        
        // Handle permanent rejection
        if (result.permanently_rejected) {
          showToast('Entry has been permanently rejected - no more edits are allowed as all nodes have reached their completion limit.');
        } else {
          showToast(`Entry ${action}d successfully! Notifications have been sent.`);
        }
        
        // Refresh diary entries and entry details
        await fetchDiaryEntries();
        await handleViewDetails(selectedDiaryEntry);
      } else {
        const error = await response.json();
        
        // Handle specific error cases
        if (error.error?.includes('completion limit')) {
          showToast(`Cannot ${action}: ${error.error}\n${error.details || ''}`);
        } else if (error.error?.includes('No previous node available')) {
          showToast(`Cannot send back: ${error.error}\n${error.details || ''}`);
        } else {
          showToast(`Failed to ${action} entry: ${error.error}`);
        }
      }
    } catch (error) {
      console.error(`Error ${action}ing entry:`, error);
      showToast(`Failed to ${action} entry. Please try again.`);
    }
  };

  // Handle form update with completion limit checking
  const handleFormUpdate = async (formData: any) => {
    if (!selectedDiaryEntry || !user?.id) return;
    
    try {
      const response = await fetch(`https://server.matrixtwin.com/api/diary/${selectedDiaryEntry.id}/update`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          formData: formData,
          action: 'update',
          userId: user.id
        })
      });

      if (response.ok) {
        // Refresh diary entries
        await fetchDiaryEntries();
        setShowFormView(false);
        showToast('Form updated successfully!');
      } else {
        const error = await response.json();
        
        // Handle completion limit errors
        if (error.error?.includes('completion limit')) {
          showToast(`Cannot update form: ${error.error}\n${error.details || ''}`);
        } else {
          showToast(`Failed to update form: ${error.error}`);
        }
      }
    } catch (error) {
      console.error('Error updating form:', error);
      showToast('Failed to update form. Please try again.');
    }
  };
  
  // Check if user can edit/approve the diary entry
  const canUserEditEntry = (entry: DiaryEntry) => {
    if (!user?.id) return false;
    
    // Check if entry is permanently rejected
    if (entry.status === 'permanently_rejected') {
      return false;
    }
    
    // Admin can edit when entry is in initial state, rejected, or pending
    if (user.role === 'admin' && (entry.status === 'pending' || entry.status === 'rejected')) {
      return true;
    }
    
    // Check if user is executor of current node and entry is rejected
    const currentNode = entry.diary_workflow_nodes?.find(
      node => node.node_order === entry.current_node_index
    );
    
    if (currentNode && currentNode.executor_id === user.id && entry.status === 'rejected') {
      return true;
    }
    
    return false;
  };

  // Check if user can update form data (with completion limit awareness)
  const canUserUpdateForm = (entry: DiaryEntry) => {
    if (!user?.id) return false;
    
    // Check if entry is permanently rejected
    if (entry.status === 'permanently_rejected') {
      return false;
    }
    
    // Admin can always edit their own entries
    if (user.role === 'admin' && entry.created_by === user.id) {
      return true;
    }
    
    // Check if user is assigned to current node
    const currentNode = entry.diary_workflow_nodes?.find(
      node => node.node_order === entry.current_node_index
    );
    
    if (currentNode && currentNode.executor_id === user.id) {
      // If entry status is 'rejected', the current node should have full access
      // regardless of completion limits (fresh chance after rejection)
      if (entry.status === 'rejected') {
        return true;
      }
      
      // For other statuses, check completion limits
      const completionCount = currentNode.completion_count || 0;
      const maxCompletions = currentNode.max_completions || 2;
      const canReEdit = currentNode.can_re_edit !== false;
      
      return canReEdit && completionCount < maxCompletions;
    }
    
    // Check if user is in assignments for current node
    const isAssigned = entry.diary_assignments?.some(
      assignment => assignment.user_id === user.id && 
                   assignment.node_id === currentNode?.node_id
    );
    
    // If assigned and entry is rejected, give full access
    if (isAssigned && entry.status === 'rejected') {
      return true;
    }
    
    return isAssigned;
  };

  // Check if user can approve entry (with completion limit awareness)
  const canUserApproveEntry = (entry: DiaryEntry) => {
    if (!user?.id) return false;
    
    // Check if entry is permanently rejected or completed
    if (entry.status === 'permanently_rejected' || entry.status === 'completed') {
      return false;
    }
    
    // Admin can approve any entry
    if (user.role === 'admin') {
      return true;
    }
    
    // Check if user is executor of current node
    const currentNode = entry.diary_workflow_nodes?.find(
      node => node.node_order === entry.current_node_index
    );
    
    if (currentNode && currentNode.executor_id === user.id) {
      // If entry status is 'rejected', the current node should have full access
      // regardless of completion limits (fresh chance after rejection)
      if (entry.status === 'rejected') {
        return true;
      }
      
      // For other statuses, check completion limits
      const completionCount = currentNode.completion_count || 0;
      const maxCompletions = currentNode.max_completions || 2;
      const canReEdit = currentNode.can_re_edit !== false;
      
      return canReEdit && completionCount < maxCompletions;
    }
    
    return false;
  };

  // Check if user can view entry (all assigned users, executors, and admin)
  const canUserViewEntry = (entry: DiaryEntry) => {
    if (!user?.id) return false;
    
    // Admin can always view
    if (user.role === 'admin') return true;
    
    // Creator can view
    if (entry.created_by === user.id) return true;
    
    // Assigned users (CC) can view
    if (entry.diary_assignments?.some((a: any) => a.user_id === user.id)) return true;
    
    // Executors can view
    if (entry.diary_workflow_nodes?.some((node: any) => node.executor_id === user.id)) return true;
    
    return false;
  };
  
  // Delete diary entry (admin only)
  const handleDeleteEntry = async (entry: DiaryEntry) => {
    if (!user?.id || user.role !== 'admin') {
      showToast('Only admins can delete diary entries.');
      return;
    }

    const confirmDelete = await showConfirm(`Are you sure you want to delete this diary entry from ${entry.date}? This action cannot be undone.`);
    if (!confirmDelete) return;

    try {
      const response = await fetch(`https://server.matrixtwin.com/api/diary/${entry.id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (response.ok) {
        // Refresh diary entries
        await fetchDiaryEntries();
        showToast('Diary entry deleted successfully!');
      } else {
        const error = await response.json();
        showToast(`Failed to delete diary entry: ${error.error}`);
      }
    } catch (error) {
      console.error('Error deleting diary entry:', error);
      showToast('Failed to delete diary entry. Please try again.');
    }
  };

  const handleSetExpiry = async (entry: DiaryEntry) => {
    if (!user?.id || user.role !== 'admin') return;

    const selectedExpiry = expiryDrafts[entry.id];
    if (!selectedExpiry) {
      showToast('Please choose an expiry date first.');
      return;
    }

    const expiryDate = new Date(selectedExpiry);
    if (Number.isNaN(expiryDate.getTime())) {
      showToast('Please provide a valid expiry date.');
      return;
    }

    try {
      setSavingExpiry((prev) => ({ ...prev, [entry.id]: true }));
      const response = await fetch(`${API_BASE_URL}/api/diary/${entry.id}/expiry`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          userId: user.id,
          expiresAt: expiryDate.toISOString()
        })
      });

      if (response.ok) {
        showToast('Expiry date updated successfully.');
        await fetchDiaryEntries();
        if (selectedDiaryEntry?.id === entry.id) {
          await handleViewDetails(entry);
        }
      } else {
        const error = await response.json();
        showToast(`Failed to set expiry date: ${error.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Error setting expiry date:', error);
      showToast('Failed to set expiry date. Please try again.');
    } finally {
      setSavingExpiry((prev) => ({ ...prev, [entry.id]: false }));
    }
  };

  const handleSetExpiryStatus = async (entry: DiaryEntry, nextActive: boolean) => {
    if (!user?.id || user.role !== 'admin') return;

    try {
      setUpdatingExpiryStatus((prev) => ({ ...prev, [entry.id]: true }));
      const response = await fetch(`${API_BASE_URL}/api/diary/${entry.id}/expiry-status`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          userId: user.id,
          active: nextActive
        })
      });

      if (response.ok) {
        showToast(nextActive ? 'Diary entry reactivated.' : 'Diary entry marked as expired.');
        await fetchDiaryEntries();
        if (selectedDiaryEntry?.id === entry.id) {
          await handleViewDetails(entry);
        }
      } else {
        const error = await response.json();
        showToast(`Failed to update expiry status: ${error.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Error updating expiry status:', error);
      showToast('Failed to update expiry status. Please try again.');
    } finally {
      setUpdatingExpiryStatus((prev) => ({ ...prev, [entry.id]: false }));
    }
  };

  const handleRenameDiary = async (entry: DiaryEntry) => {
    if (!user?.id || user.role !== 'admin') return;

    const currentName = getDiaryDisplayName(entry);
    const nextNamePrompt = await showPrompt({
      title: 'Rename Diary',
      message: 'Enter new diary name:',
      defaultValue: currentName,
      placeholder: 'Enter diary name',
      confirmLabel: 'Rename'
    });
    if (nextNamePrompt === null) return;
    const nextName = nextNamePrompt.trim();

    if (!nextName) {
      showToast('Diary name cannot be empty.');
      return;
    }

    if (nextName === currentName) {
      return;
    }

    try {
      setRenamingDiary((prev) => ({ ...prev, [entry.id]: true }));
      const response = await fetch(`${API_BASE_URL}/api/diary/${entry.id}/name`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          userId: user.id,
          name: nextName
        })
      });

      if (response.ok) {
        showToast('Diary renamed successfully.');
        await fetchDiaryEntries();
        if (selectedDiaryEntry?.id === entry.id) {
          await handleViewDetails(entry);
        }
      } else {
        const error = await response.json();
        showToast(`Failed to rename diary: ${error.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Error renaming diary:', error);
      showToast('Failed to rename diary. Please try again.');
    } finally {
      setRenamingDiary((prev) => ({ ...prev, [entry.id]: false }));
    }
  };

  const handleNodeReminder = async (entry: DiaryEntry, node: any, nodeOrder: number) => {
    if (!user?.id || user.role !== 'admin') return;

    const defaultMessage = `Reminder: Please action "${node.node_name}" step.`;
    const messageInput = await showPrompt({
      title: 'Send Reminder',
      message: 'Enter reminder message for this step:',
      defaultValue: defaultMessage,
      placeholder: 'Enter reminder message',
      confirmLabel: 'Send'
    });
    if (messageInput === null) return;
    const message = messageInput.trim() || defaultMessage;
    const reminderKey = `${entry.id}-${nodeOrder}`;

    try {
      setSendingNodeReminder((prev) => ({ ...prev, [reminderKey]: true }));
      const response = await fetch(`${API_BASE_URL}/api/diary/${entry.id}/nodes/${nodeOrder}/delay-notify`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          userId: user.id,
          message
        })
      });

      if (response.ok) {
        showToast('Reminder sent successfully for this node.');
      } else {
        const error = await response.json();
        showToast(`Failed to send reminder: ${error.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Error sending node reminder:', error);
      showToast('Failed to send reminder. Please try again.');
    } finally {
      setSendingNodeReminder((prev) => ({ ...prev, [reminderKey]: false }));
    }
  };
  
  // Get the weather icon based on condition
  const getWeatherIcon = (weather: string) => {
    if (weather.toLowerCase().includes('sun') || weather.toLowerCase().includes('clear')) {
      return <RiIcons.RiSunLine className="text-[#789a3b]" />;
    } else if (weather.toLowerCase().includes('cloud')) {
      return <RiIcons.RiCloudyLine className="text-[#647f31]" />;
    } else if (weather.toLowerCase().includes('rain')) {
      return <RiIcons.RiRainyLine className="text-[#526728]" />;
    } else if (weather.toLowerCase().includes('snow')) {
      return <RiIcons.RiSnowflakeLine className="text-[#b0c985]" />;
    } else {
      return <RiIcons.RiSunCloudyLine className="text-[#6f8f36]" />;
    }
  };
  
  // Stats for the header section
  const getStats = () => {
    const totalEntries = diaryEntries.length;
    const thisWeekEntries = diaryEntries.filter(entry => {
      const entryDate = new Date(entry.date);
      const today = new Date();
      const startOfWeek = new Date(today);
      startOfWeek.setDate(today.getDate() - today.getDay());
      return entryDate >= startOfWeek;
    }).length;
    
    const uniqueAuthors = new Set(diaryEntries.map(entry => entry.author)).size;
    const pendingEntries = diaryEntries.filter(entry => entry.status === 'pending').length;
    const completedEntries = diaryEntries.filter(entry => entry.status === 'completed').length;

    return { totalEntries, thisWeekEntries, uniqueAuthors, pendingEntries, completedEntries };
  };
  
  const stats = getStats();
  const statusCounts = useMemo(() => ({
    all: diaryEntries.length,
    pending: diaryEntries.filter((entry) => entry.status === 'pending').length,
    completed: diaryEntries.filter((entry) => entry.status === 'completed').length,
    rejected: diaryEntries.filter((entry) => entry.status === 'rejected').length,
    permanently_rejected: diaryEntries.filter((entry) => entry.status === 'permanently_rejected').length
  }), [diaryEntries]);
  const reportEntries = useMemo(() => filteredEntries, [filteredEntries]);

  const reportStatusCounts = useMemo(() => ({
    pending: reportEntries.filter((entry) => entry.status === 'pending').length,
    completed: reportEntries.filter((entry) => entry.status === 'completed').length,
    rejected: reportEntries.filter((entry) => entry.status === 'rejected').length,
    permanentlyRejected: reportEntries.filter((entry) => entry.status === 'permanently_rejected').length
  }), [reportEntries]);

  const reportEntriesByDate = useMemo(() => {
    const grouped = reportEntries.reduce((acc, entry) => {
      const dateKey = entry.date;
      acc[dateKey] = (acc[dateKey] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return Object.entries(grouped)
      .sort((a, b) => new Date(a[0]).getTime() - new Date(b[0]).getTime())
      .map(([date, count]) => ({
        date,
        label: new Date(date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
        count
      }));
  }, [reportEntries]);

  const weatherAnalytics = useMemo(() => {
    const normalize = (weather: string) => {
      const value = (weather || '').toLowerCase();
      if (value.includes('sun') || value.includes('clear')) return 'Sunny';
      if (value.includes('cloud')) return 'Cloudy';
      if (value.includes('rain') || value.includes('storm')) return 'Rainy';
      if (value.includes('snow')) return 'Snow';
      if (value.includes('wind')) return 'Windy';
      return 'Other';
    };

    const grouped = reportEntries.reduce((acc, entry) => {
      const key = normalize(entry.weather);
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return Object.entries(grouped)
      .sort((a, b) => b[1] - a[1])
      .map(([weather, count]) => ({ weather, count }));
  }, [reportEntries]);

  const contributorAnalytics = useMemo(() => {
    const contributorMap = reportEntries.reduce((acc, entry) => {
      if (!acc[entry.author]) {
        acc[entry.author] = { author: entry.author, total: 0, completed: 0, pending: 0 };
      }

      acc[entry.author].total += 1;
      if (entry.status === 'completed') acc[entry.author].completed += 1;
      if (entry.status === 'pending') acc[entry.author].pending += 1;
      return acc;
    }, {} as Record<string, { author: string; total: number; completed: number; pending: number }>);

    return Object.values(contributorMap).sort((a, b) => b.total - a.total);
  }, [reportEntries]);

  const incidentEntries = useMemo(() => {
    return reportEntries.filter((entry) => {
      const value = (entry.incidents_reported || '').trim().toLowerCase();
      return value && value !== 'none' && value !== 'n/a' && value !== 'na' && value !== 'nil' && value !== 'no incidents';
    });
  }, [reportEntries]);

  const averageTemperature = useMemo(() => {
    const parsed = reportEntries
      .map((entry) => parseFloat((entry.temperature || '').replace(/[^\d.-]/g, '')))
      .filter((value) => !Number.isNaN(value));

    if (parsed.length === 0) return null;
    const sum = parsed.reduce((acc, value) => acc + value, 0);
    return (sum / parsed.length).toFixed(1);
  }, [reportEntries]);

  const reportHighlights = useMemo(() => {
    const total = reportEntries.length;
    const completed = reportStatusCounts.completed;
    const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0;
    const incidentRate = total > 0 ? Math.round((incidentEntries.length / total) * 100) : 0;
    const topContributor = contributorAnalytics[0];
    const topWeather = weatherAnalytics[0];

    return [
      `Completion rate is ${completionRate}% across ${total} diary entries.`,
      `${incidentEntries.length} entries include incidents (${incidentRate}% of listed diaries).`,
      topContributor ? `${topContributor.author} logged the highest entries (${topContributor.total}).` : 'No contributor activity available.',
      topWeather ? `Most common weather pattern is ${topWeather.weather} (${topWeather.count} entries).` : 'No weather trend available.',
      averageTemperature ? `Average captured temperature is ${averageTemperature}°.` : 'Not enough temperature data to calculate average.'
    ];
  }, [reportEntries, reportStatusCounts.completed, incidentEntries.length, contributorAnalytics, weatherAnalytics, averageTemperature]);

  const statusChartData = useMemo(() => ({
    labels: ['Pending', 'Completed', 'Rejected', 'Permanently Rejected'],
    datasets: [
      {
        data: [
          reportStatusCounts.pending,
          reportStatusCounts.completed,
          reportStatusCounts.rejected,
          reportStatusCounts.permanentlyRejected
        ],
        backgroundColor: ['#b0c985', '#526728', '#9aac6d', '#2f3a17'],
        borderColor: '#ffffff',
        borderWidth: 2
      }
    ]
  }), [reportStatusCounts]);

  const trendChartData = useMemo(() => ({
    labels: reportEntriesByDate.map((item) => item.label),
    datasets: [
      {
        label: 'Entries',
        data: reportEntriesByDate.map((item) => item.count),
        borderColor: '#526728',
        backgroundColor: 'rgba(82, 103, 40, 0.2)',
        fill: true,
        tension: 0.3
      }
    ]
  }), [reportEntriesByDate]);

  const contributorChartData = useMemo(() => {
    const topContributors = contributorAnalytics.slice(0, 6);
    return {
      labels: topContributors.map((entry) => entry.author),
      datasets: [
        {
          label: 'Total Entries',
          data: topContributors.map((entry) => entry.total),
          backgroundColor: 'rgba(120, 154, 59, 0.8)',
          borderColor: '#526728',
          borderWidth: 1,
          borderRadius: 6
        }
      ]
    };
  }, [contributorAnalytics]);

  const weatherChartData = useMemo(() => ({
    labels: weatherAnalytics.map((item) => item.weather),
    datasets: [
      {
        label: 'Entries',
        data: weatherAnalytics.map((item) => item.count),
        backgroundColor: 'rgba(176, 201, 133, 0.85)',
        borderColor: '#526728',
        borderWidth: 1,
        borderRadius: 6
      }
    ]
  }), [weatherAnalytics]);

  const chartOptions = useMemo(() => ({
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        labels: {
          color: '#40501f'
        }
      }
    },
    scales: {
      x: {
        ticks: { color: '#526728' },
        grid: { color: 'rgba(82, 103, 40, 0.08)' }
      },
      y: {
        beginAtZero: true,
        ticks: { color: '#526728' },
        grid: { color: 'rgba(82, 103, 40, 0.08)' }
      }
    }
  }), []);

  const handleDownloadReportPdf = async () => {
    if (!reportContentRef.current || isDownloadingReport) return;

    try {
      setIsDownloadingReport(true);
      await new Promise((resolve) => setTimeout(resolve, 200));
      const fileName = `diary-report-${new Date().toISOString().slice(0, 10)}.pdf`;
      await exportReportElementToSinglePagePdf(reportContentRef.current, fileName);
    } catch (error) {
      console.error('Failed to download diary report PDF:', error);
      showToast('Unable to generate PDF. Please try again.');
    } finally {
      setIsDownloadingReport(false);
    }
  };

  // Get workflow status badge
  const getWorkflowStatusBadge = (entry: DiaryEntry) => {
    const statusColors = {
      pending: 'bg-[#e2ebcf] text-[#526728] dark:bg-[#2f3a17]/40 dark:text-[#b0c985]',
      completed: 'bg-[#cbdcab] text-[#40501f] dark:bg-[#2f3a17]/50 dark:text-[#cbdcab]',
      rejected: 'bg-[#dbe5c4] text-[#526728] dark:bg-[#2f3a17]/40 dark:text-[#b0c985]',
      permanently_rejected: 'bg-[#c9d8a5] text-[#2f3a17] dark:bg-[#2f3a17]/60 dark:text-[#cbdcab]'
    };

    // Get current node completion info
    const currentNode = entry.diary_workflow_nodes?.find(
      node => node.node_order === entry.current_node_index
    );
    
    let statusText = entry.status.charAt(0).toUpperCase() + entry.status.slice(1);
    let completionInfo = '';
    
    if (entry.status === 'permanently_rejected') {
      statusText = 'Permanently Rejected';
    } else if (currentNode && entry.status === 'pending') {
      const completionCount = currentNode.completion_count || 0;
      const maxCompletions = currentNode.max_completions || 2;
      completionInfo = ` (${completionCount}/${maxCompletions})`;
      
      if (completionCount >= maxCompletions && !currentNode.can_re_edit) {
        statusText = 'Limit Reached';
      }
    }

    return (
      <div className="flex flex-col items-start">
        <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusColors[entry.status as keyof typeof statusColors] || statusColors.pending}`}>
          {statusText}
        </span>
        {completionInfo && (
          <span className="text-xs text-[#647f31] dark:text-[#a4b986] mt-1">
            Completions{completionInfo}
          </span>
        )}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-dvh">
        <div className="text-center">
          <RiIcons.RiLoader4Line className="animate-spin text-4xl text-[#647f31] mx-auto mb-4" />
          <p className="text-secondary-600 dark:text-secondary-400">Loading diary entries...</p>
        </div>
      </div>
    );
  }
  
  return (
    <div className="mx-auto max-w-7xl space-y-6 px-3 sm:px-0 pb-12">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-[#1f2710] via-[#2f3a17] to-[#526728] p-4 sm:p-6 md:p-8"
      >
        <div className="absolute inset-0 bg-ai-dots opacity-20" />
        <div className="relative z-10">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="space-y-2">
              <h1 className="flex items-center text-2xl sm:text-3xl font-display font-bold text-white md:text-4xl">
                <RiIcons.RiCalendarCheckLine className="mr-3 text-[#cbdcab]" />
                {t('diary.title')}
              </h1>
              <p className="max-w-3xl text-sm text-white/75 md:text-base">
                Manage daily site logs with faster scanning, stronger status visibility, and cleaner project context.
              </p>
              <div className={`inline-flex items-center rounded-full border px-3 py-1 text-sm ${
                selectedProject
                  ? 'border-[#cbdcab]/40 bg-[#b0c985]/15 text-[#e2ebcf]'
                  : 'border-[#a4b986]/40 bg-[#647f31]/20 text-[#dbe5c4]'
              }`}>
                {selectedProject ? <RiIcons.RiBuilding4Line className="mr-2" /> : <RiIcons.RiAlertLine className="mr-2" />}
                {selectedProject ? `Project: ${selectedProject.name}` : 'No project selected'}
              </div>
            </div>
            <div className="flex flex-wrap gap-3">
              {user?.role === 'admin' && selectedProject && (
                <Button
                  variant="primary"
                  leftIcon={<RiIcons.RiAddLine />}
                  onClick={() => setShowNewEntry(true)}
                  className="whitespace-nowrap"
                  animated
                >
                  New Entry
                </Button>
              )}
              <Button
                variant="outline"
                leftIcon={<RiIcons.RiFileTextLine />}
                onClick={() => setShowReport(true)}
                className="whitespace-nowrap"
              >
                Generate Report
              </Button>
            </div>
          </div>
          <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            <div className="rounded-xl border border-white/10 bg-white/10 p-4">
              <div className="text-xs uppercase tracking-wide text-white/70">Total</div>
              <div className="mt-1 text-2xl font-semibold text-white">{stats.totalEntries}</div>
            </div>
            <div className="rounded-xl border border-white/10 bg-white/10 p-4">
              <div className="text-xs uppercase tracking-wide text-white/70">This Week</div>
              <div className="mt-1 text-2xl font-semibold text-white">{stats.thisWeekEntries}</div>
            </div>
            <div className="rounded-xl border border-white/10 bg-white/10 p-4">
              <div className="text-xs uppercase tracking-wide text-white/70">Pending</div>
              <div className="mt-1 text-2xl font-semibold text-[#dbe5c4]">{stats.pendingEntries}</div>
            </div>
            <div className="rounded-xl border border-white/10 bg-white/10 p-4">
              <div className="text-xs uppercase tracking-wide text-white/70">Completed</div>
              <div className="mt-1 text-2xl font-semibold text-[#cbdcab]">{stats.completedEntries}</div>
            </div>
            <div className="rounded-xl border border-white/10 bg-white/10 p-4">
              <div className="text-xs uppercase tracking-wide text-white/70">Contributors</div>
              <div className="mt-1 text-2xl font-semibold text-white">{stats.uniqueAuthors}</div>
            </div>
          </div>
        </div>
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <Card variant="glass" className="space-y-4 border border-secondary-200/60 p-4 md:p-5 dark:border-dark-700">
          <div className="flex items-center justify-between">
            <div className="flex items-center text-sm font-semibold text-secondary-800 dark:text-secondary-200">
              <RiIcons.RiFilter3Line className="mr-2 text-[#647f31] dark:text-[#b0c985]" />
              Search & Filter
            </div>
            {(searchQuery || statusFilter !== 'all') && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setSearchQuery('');
                  setStatusFilter('all');
                }}
              >
                Reset
              </Button>
            )}
          </div>
          <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr),200px,190px]">
            <div className="relative">
              <RiIcons.RiSearchLine className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-secondary-500" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={`${t('common.search')} by project, author, work`}
                className="h-11 w-full rounded-xl border border-secondary-200 bg-white py-2.5 pl-10 pr-10 text-sm text-secondary-900 outline-none transition focus:border-[#94b35f] focus:ring-2 focus:ring-[#cbdcab] dark:border-dark-600 dark:bg-dark-800 dark:text-white dark:focus:ring-[#789a3b]/20"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-secondary-500 hover:text-secondary-700 dark:hover:text-secondary-300"
                >
                  <RiIcons.RiCloseLine />
                </button>
              )}
            </div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as typeof statusFilter)}
              className="h-11 rounded-xl border border-secondary-200 bg-white px-3 text-sm text-secondary-900 outline-none transition focus:border-[#94b35f] focus:ring-2 focus:ring-[#cbdcab] dark:border-dark-600 dark:bg-dark-800 dark:text-white dark:focus:ring-[#789a3b]/20"
            >
              <option value="all">All statuses</option>
              <option value="pending">Pending</option>
              <option value="completed">Completed</option>
              <option value="rejected">Rejected</option>
              <option value="permanently_rejected">Permanently Rejected</option>
            </select>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as 'newest' | 'oldest')}
              className="h-11 rounded-xl border border-secondary-200 bg-white px-3 text-sm text-secondary-900 outline-none transition focus:border-[#94b35f] focus:ring-2 focus:ring-[#cbdcab] dark:border-dark-600 dark:bg-dark-800 dark:text-white dark:focus:ring-[#789a3b]/20"
            >
              <option value="newest">Newest first</option>
              <option value="oldest">Oldest first</option>
            </select>
          </div>
          <div className="flex gap-2 overflow-x-auto pb-1">
            {[
              { key: 'all', label: 'All' },
              { key: 'pending', label: 'Pending' },
              { key: 'completed', label: 'Completed' },
              { key: 'rejected', label: 'Rejected' },
              { key: 'permanently_rejected', label: 'Permanent' }
            ].map((filter) => (
              <button
                key={filter.key}
                type="button"
                onClick={() => setStatusFilter(filter.key as typeof statusFilter)}
                className={`inline-flex min-w-max items-center rounded-full border px-3 py-1.5 text-xs font-medium transition ${
                  statusFilter === filter.key
                    ? 'border-[#789a3b] bg-[#789a3b] text-white shadow-sm'
                    : 'border-secondary-200 bg-white text-secondary-700 hover:border-[#b0c985] hover:text-[#526728] dark:border-dark-600 dark:bg-dark-800 dark:text-secondary-300 dark:hover:border-[#789a3b]/40'
                }`}
              >
                <span>{filter.label}</span>
                <span className={`ml-2 rounded-full px-2 py-0.5 text-[10px] ${
                  statusFilter === filter.key
                    ? 'bg-white/20 text-white'
                    : 'bg-secondary-100 text-secondary-600 dark:bg-dark-700 dark:text-secondary-300'
                }`}>
                  {statusCounts[filter.key as keyof typeof statusCounts]}
                </span>
              </button>
            ))}
            <div className="ml-auto inline-flex min-w-max items-center rounded-full border border-secondary-200 bg-secondary-50 px-3 py-1.5 text-xs text-secondary-700 dark:border-dark-600 dark:bg-dark-800 dark:text-secondary-200">
              <RiIcons.RiListCheck3 className="mr-1.5" />
              {filteredEntries.length} shown
            </div>
          </div>
        </Card>
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }}>
        {filteredEntries.length > 0 ? (
          <div className="grid gap-5 lg:grid-cols-2">
            {filteredEntries.map((entry, index) => (
              <motion.div
                key={entry.id}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: Math.min(index * 0.06, 0.4) }}
              >
                <Card className="h-full border border-[#cbdcab]/60 bg-gradient-to-b from-white to-[#f2f6e9]/80 p-0 dark:border-dark-700 dark:from-dark-900 dark:to-dark-800/80">
                  <div className="border-b border-[#cbdcab]/70 bg-gradient-to-r from-[#e2ebcf]/70 via-[#f2f6e9]/70 to-white p-4 dark:border-dark-700 dark:from-[#2f3a17]/30 dark:via-dark-800 dark:to-dark-900">
                    <div className="mb-2 flex items-start justify-between gap-3">
                      <div>
                        <div className="flex items-center text-sm text-secondary-600 dark:text-secondary-300">
                          <RiIcons.RiCalendarLine className="mr-2 text-[#647f31] dark:text-[#b0c985]" />
                          {entry.date}
                        </div>
                        <h3 className="mt-1 text-lg font-semibold text-secondary-900 dark:text-white">
                          {getDiaryDisplayName(entry)}
                        </h3>
                      </div>
                      {getWorkflowStatusBadge(entry)}
                    </div>
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-secondary-600 dark:text-secondary-300">
                      <span className="inline-flex items-center">
                        <RiIcons.RiUserLine className="mr-1" />
                        {entry.author}
                      </span>
                      <span className="inline-flex items-center">
                        Form No: {getDiaryFormNo(entry)}
                      </span>
                      <span className="inline-flex items-center">
                        <span className="mr-1">{getWeatherIcon(entry.weather)}</span>
                        {entry.weather}, {entry.temperature}
                      </span>
                      <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium ${getExpirySummary(entry).className}`}>
                        <RiIcons.RiTimerLine className="mr-1" />
                        {getExpirySummary(entry).text}
                      </span>
                    </div>
                  </div>
                  <div className="space-y-4 p-4">
                    <div>
                      <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-secondary-500 dark:text-secondary-400">
                        {t('diary.workCompleted')}
                      </div>
                      <p className="line-clamp-3 text-sm text-secondary-700 dark:text-secondary-300">
                        {entry.work_completed}
                      </p>
                    </div>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <div className="rounded-lg border border-[#cbdcab]/60 bg-[#f2f6e9]/70 p-3 dark:border-dark-700 dark:bg-dark-800/70">
                        <div className="text-xs font-medium uppercase tracking-wide text-secondary-500 dark:text-secondary-400">
                          {t('diary.incidents')}
                        </div>
                        <p className="mt-1 line-clamp-2 text-sm text-secondary-700 dark:text-secondary-300">
                          {entry.incidents_reported || t('common.none')}
                        </p>
                      </div>
                      <div className="rounded-lg border border-[#cbdcab]/60 bg-[#f2f6e9]/70 p-3 dark:border-dark-700 dark:bg-dark-800/70">
                        <div className="text-xs font-medium uppercase tracking-wide text-secondary-500 dark:text-secondary-400">
                          {t('diary.materials')}
                        </div>
                        <p className="mt-1 line-clamp-2 text-sm text-secondary-700 dark:text-secondary-300">
                          {entry.materials_delivered || t('common.none')}
                        </p>
                      </div>
                    </div>
                    <div className="rounded-lg border border-[#cbdcab]/60 bg-white/90 p-3 dark:border-dark-700 dark:bg-dark-800/70">
                      <div className="text-xs font-medium uppercase tracking-wide text-secondary-500 dark:text-secondary-400">
                        {t('diary.notes')}
                      </div>
                      <p className="mt-1 line-clamp-2 text-sm text-secondary-700 dark:text-secondary-300">
                        {entry.notes || t('common.none')}
                      </p>
                    </div>
                    {user?.role === 'admin' && (
                      <div className="rounded-lg border border-[#cbdcab]/60 bg-[#f2f6e9]/70 p-3 dark:border-dark-700 dark:bg-dark-800/70">
                        <div className="mb-2 text-xs font-medium uppercase tracking-wide text-secondary-500 dark:text-secondary-400">
                          {isEntryExpired(entry) ? 'Activation' : 'Expiry Controls'}
                        </div>
                        {isEntryExpired(entry) ? (
                          <div className="flex justify-end">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleSetExpiryStatus(entry, true)}
                              isLoading={!!updatingExpiryStatus[entry.id]}
                              leftIcon={<RiIcons.RiRefreshLine />}
                              className="h-9"
                            >
                              Set Active
                            </Button>
                          </div>
                        ) : (
                          <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr),auto,auto]">
                            <input
                              type="datetime-local"
                              value={expiryDrafts[entry.id] || ''}
                              onChange={(e) => setExpiryDrafts((prev) => ({ ...prev, [entry.id]: e.target.value }))}
                              className="h-9 rounded-lg border border-secondary-200 bg-white px-3 text-xs text-secondary-900 outline-none transition [color-scheme:light] [&::-webkit-calendar-picker-indicator]:cursor-pointer dark:border-dark-600 dark:bg-white dark:text-secondary-900 dark:focus:ring-[#789a3b]/20 focus:border-[#94b35f] focus:ring-2 focus:ring-[#cbdcab]"
                            />
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleSetExpiry(entry)}
                              isLoading={!!savingExpiry[entry.id]}
                              leftIcon={<RiIcons.RiCalendarEventLine className="text-[#526728] dark:text-[#b0c985]" />}
                              className="h-9"
                            >
                              Set Expiry
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleSetExpiryStatus(entry, false)}
                              isLoading={!!updatingExpiryStatus[entry.id]}
                              leftIcon={<RiIcons.RiTimerLine />}
                              className="h-9"
                            >
                              Set Expired
                            </Button>
                          </div>
                        )}
                      </div>
                    )}
                    <div className="flex flex-wrap justify-end gap-2 pt-1">
                      {canUserViewEntry(entry) && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleViewDetails(entry)}
                          rightIcon={<RiIcons.RiArrowRightLine />}
                        >
                          {t('common.viewDetails')}
                        </Button>
                      )}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleViewHistory(entry)}
                        leftIcon={<RiIcons.RiHistoryLine />}
                      >
                        History
                      </Button>
                      {user?.role === 'admin' && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleRenameDiary(entry)}
                          isLoading={!!renamingDiary[entry.id]}
                          leftIcon={<RiIcons.RiEditLine />}
                          className="border-[#a4b986] text-[#526728] hover:border-[#94b35f] hover:bg-[#f2f6e9] dark:hover:bg-[#2f3a17]/30"
                        >
                          Rename
                        </Button>
                      )}
                      {user?.role === 'admin' && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDeleteEntry(entry)}
                          leftIcon={<RiIcons.RiDeleteBinLine />}
                          className="border-[#a4b986] text-[#526728] hover:border-[#94b35f] hover:bg-[#f2f6e9] dark:hover:bg-[#2f3a17]/30"
                        >
                          Delete
                        </Button>
                      )}
                    </div>
                  </div>
                </Card>
              </motion.div>
            ))}
          </div>
        ) : (
          <Card className="border border-[#cbdcab]/60 bg-gradient-to-b from-white to-[#f2f6e9]/80 p-10 text-center dark:border-dark-700 dark:from-dark-900 dark:to-dark-800/80">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-[#e2ebcf] text-[#647f31] dark:bg-[#2f3a17]/40 dark:text-[#b0c985]">
              <RiIcons.RiCalendarCheckLine className="text-3xl" />
            </div>
            {!selectedProject ? (
              <>
                <h2 className="text-xl font-display font-semibold text-secondary-900 dark:text-white">No Project Selected</h2>
                <p className="mx-auto mt-2 max-w-lg text-sm text-secondary-600 dark:text-secondary-400">
                  Select a project to view and manage diary activity in one place.
                </p>
              </>
            ) : diaryEntries.length === 0 ? (
              <>
                <h2 className="text-xl font-display font-semibold text-secondary-900 dark:text-white">No Diary Entries Yet</h2>
                <p className="mx-auto mt-2 max-w-lg text-sm text-secondary-600 dark:text-secondary-400">
                  {selectedProject.name} has no diary records yet. Start with your first professional daily log.
                </p>
                {user?.role === 'admin' && (
                  <div className="mt-5">
                    <Button variant="primary" leftIcon={<RiIcons.RiAddLine />} onClick={() => setShowNewEntry(true)}>
                      Create First Entry
                    </Button>
                  </div>
                )}
              </>
            ) : (
              <>
                <h2 className="text-xl font-display font-semibold text-secondary-900 dark:text-white">No Results Found</h2>
                <p className="mx-auto mt-2 max-w-lg text-sm text-secondary-600 dark:text-secondary-400">
                  No entries match the current search or filter criteria.
                </p>
                <div className="mt-5 flex justify-center gap-2">
                  <Button variant="outline" onClick={() => setSearchQuery('')}>
                    Clear Search
                  </Button>
                  <Button variant="outline" onClick={() => setStatusFilter('all')}>
                    Reset Filter
                  </Button>
                </div>
              </>
            )}
          </Card>
        )}
      </motion.div>
      
      {/* New Diary Entry Modal */}
      {showNewEntry && (
        <AnimatePresence>
          <div 
            className="fixed inset-0 z-50 flex items-end justify-center bg-[#1f2710]/70 p-0 backdrop-blur-md sm:items-center sm:p-4"
            onClick={() => setShowNewEntry(false)}
          >
            <motion.div
              className="h-[95dvh] w-full overflow-hidden rounded-t-2xl border border-[#cbdcab]/70 bg-gradient-to-b from-white to-[#f2f6e9]/90 shadow-2xl dark:border-dark-700 dark:from-dark-900 dark:to-dark-800 sm:h-auto sm:max-h-[92vh] sm:max-w-6xl sm:rounded-2xl"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.3 }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="sticky top-0 z-20 flex items-center justify-between border-b border-[#cbdcab]/70 bg-gradient-to-r from-[#1f2710] to-[#526728] px-4 py-3 text-white backdrop-blur-sm dark:border-dark-700">
                <div className="text-sm font-semibold text-secondary-900 dark:text-white">New Diary Entry</div>
                <Button variant="ghost" size="sm" onClick={() => setShowNewEntry(false)} leftIcon={<RiIcons.RiCloseLine />}>
                  Close
                </Button>
              </div>
              <div className="max-h-[calc(95dvh-56px)] overflow-y-auto sm:max-h-[calc(92vh-56px)]">
              <SiteDiaryFormTemplate
                onClose={() => setShowNewEntry(false)}
                onSave={handleCreateEntry}
              />
              </div>
            </motion.div>
          </div>
        </AnimatePresence>
      )}
      
      {/* Entry Details Dialog */}
      <Dialog
        isOpen={showDetails}
        onClose={() => setShowDetails(false)}
        title={t('diary.entryDetails')}
        className="w-full max-w-5xl border border-secondary-200/80 bg-white/95 shadow-2xl dark:border-dark-700 dark:bg-dark-900/95"
        disablePadding
      >
        {selectedDiaryEntry && (
          <div className="max-h-[80vh] space-y-5 overflow-y-auto p-5">
            <div className="flex items-center justify-between rounded-xl border border-secondary-200 bg-secondary-50 p-3 dark:border-dark-700 dark:bg-dark-800/80">
              <div className="text-lg font-bold text-[#2f3a17] dark:text-[#b0c985] flex items-center">
                <RiIcons.RiCalendarCheckLine className="mr-2 text-[#647f31] dark:text-[#b0c985]" />
                {selectedDiaryEntry.date}
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div className="rounded-xl border border-secondary-200 bg-secondary-50/80 p-4 shadow-sm dark:border-dark-700 dark:bg-dark-800/80">
                <div className="flex items-center text-secondary-600 dark:text-secondary-400 mb-2">
                  <RiIcons.RiUserLine className="mr-2 text-[#647f31] dark:text-[#b0c985]" />
                  <span className="text-sm font-medium uppercase tracking-wide">{t('diary.author')}</span>
                </div>
                <div className="font-medium">{selectedDiaryEntry.author}</div>
              </div>
              
              <div className="rounded-xl border border-secondary-200 bg-secondary-50/80 p-4 shadow-sm dark:border-dark-700 dark:bg-dark-800/80">
                <div className="flex items-center text-secondary-600 dark:text-secondary-400 mb-2">
                  <div className="mr-2 text-[#647f31] dark:text-[#b0c985]">
                    {getWeatherIcon(selectedDiaryEntry.weather)}
                  </div>
                  <span className="text-sm font-medium uppercase tracking-wide">{t('diary.weatherConditions')}</span>
                </div>
                <div className="font-medium">{selectedDiaryEntry.weather}, {selectedDiaryEntry.temperature}</div>
              </div>
            </div>
            
            <div className="rounded-xl border border-secondary-200 bg-secondary-50/80 p-4 shadow-sm dark:border-dark-700 dark:bg-dark-800/80">
              <div className="flex items-center text-secondary-600 dark:text-secondary-400 mb-2">
                <RiIcons.RiTaskLine className="mr-2 text-[#647f31] dark:text-[#b0c985]" />
                <span className="text-sm font-medium uppercase tracking-wide">{t('diary.workCompleted')}</span>
              </div>
              <div className="whitespace-pre-line">{selectedDiaryEntry.work_completed}</div>
            </div>
            
            <div className="rounded-xl border border-secondary-200 bg-secondary-50/80 p-4 shadow-sm dark:border-dark-700 dark:bg-dark-800/80">
              <div className="flex items-center text-secondary-600 dark:text-secondary-400 mb-2">
                <RiIcons.RiAlertLine className="mr-2 text-[#647f31] dark:text-[#b0c985]" />
                <span className="text-sm font-medium uppercase tracking-wide">{t('diary.incidentsReported')}</span>
              </div>
              <div>{selectedDiaryEntry.incidents_reported || t('common.none')}</div>
            </div>
            
            <div className="rounded-xl border border-secondary-200 bg-secondary-50/80 p-4 shadow-sm dark:border-dark-700 dark:bg-dark-800/80">
              <div className="flex items-center text-secondary-600 dark:text-secondary-400 mb-2">
                <RiIcons.RiTruckLine className="mr-2 text-[#647f31] dark:text-[#b0c985]" />
                <span className="text-sm font-medium uppercase tracking-wide">{t('diary.materialsDelivered')}</span>
              </div>
              <div>{selectedDiaryEntry.materials_delivered || t('common.none')}</div>
            </div>
            
            <div className="rounded-xl border border-secondary-200 bg-secondary-50/80 p-4 shadow-sm dark:border-dark-700 dark:bg-dark-800/80">
              <div className="flex items-center text-secondary-600 dark:text-secondary-400 mb-2">
                <RiIcons.RiFileTextLine className="mr-2 text-[#647f31] dark:text-[#b0c985]" />
                <span className="text-sm font-medium uppercase tracking-wide">{t('diary.notes')}</span>
              </div>
              <div>{selectedDiaryEntry.notes || t('common.none')}</div>
            </div>
            
            {/* Workflow Status Section */}
            {selectedDiaryEntry.diary_workflow_nodes && selectedDiaryEntry.diary_workflow_nodes.length > 0 && (
              <div className="rounded-xl border border-secondary-200 bg-secondary-50/80 p-4 shadow-sm dark:border-dark-700 dark:bg-dark-800/80">
                <div className="flex items-center text-secondary-600 dark:text-secondary-400 mb-4">
                  <RiIcons.RiFlowChart className="mr-2 text-[#647f31] dark:text-[#b0c985]" />
                  <span className="text-sm font-medium uppercase tracking-wide">Workflow Status</span>
                </div>
                
                <div className="space-y-3">
                  {selectedDiaryEntry.diary_workflow_nodes
                    .sort((a: any, b: any) => a.node_order - b.node_order)
                    .map((node: any, index: number, nodes: any[]) => {
                      const isBoundaryNode = index === 0 || index === nodes.length - 1;
                      return (
                      <div key={node.id} className="flex items-center justify-between p-3 bg-secondary-50 dark:bg-dark-700 rounded-lg">
                        <div className="flex items-center">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center mr-3 ${
                            node.status === 'completed' ? 'bg-[#cbdcab] text-[#40501f] dark:bg-[#2f3a17]/40 dark:text-[#cbdcab]' :
                            node.status === 'pending' ? 'bg-[#e2ebcf] text-[#526728] dark:bg-[#2f3a17]/40 dark:text-[#b0c985]' :
                            node.status === 'rejected' ? 'bg-[#dbe5c4] text-[#526728] dark:bg-[#2f3a17]/40 dark:text-[#a4b986]' :
                            'bg-[#e2ebcf] text-[#647f31] dark:bg-[#2f3a17]/30 dark:text-[#a4b986]'
                          }`}>
                            {node.status === 'completed' ? <RiIcons.RiCheckLine /> :
                             node.status === 'pending' ? <RiIcons.RiTimeLine /> :
                             node.status === 'rejected' ? <RiIcons.RiCloseLine /> :
                             <RiIcons.RiMoreLine />}
                          </div>
                          <div>
                            <div className="font-medium text-secondary-900 dark:text-white">{node.node_name}</div>
                            {node.executor_name && (
                              <div className="text-sm text-secondary-600 dark:text-secondary-400">
                                Assigned to: {node.executor_name}
                              </div>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                            node.status === 'completed' ? 'bg-[#cbdcab] text-[#40501f] dark:bg-[#2f3a17]/40 dark:text-[#cbdcab]' :
                            node.status === 'pending' ? 'bg-[#e2ebcf] text-[#526728] dark:bg-[#2f3a17]/40 dark:text-[#b0c985]' :
                            node.status === 'rejected' ? 'bg-[#dbe5c4] text-[#526728] dark:bg-[#2f3a17]/40 dark:text-[#a4b986]' :
                            'bg-[#e2ebcf] text-[#647f31] dark:bg-[#2f3a17]/30 dark:text-[#a4b986]'
                          }`}>
                            {node.status.charAt(0).toUpperCase() + node.status.slice(1)}
                          </span>
                          {user?.role === 'admin' && !isBoundaryNode && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleNodeReminder(selectedDiaryEntry, node, typeof node.node_order === 'number' ? node.node_order : index + 1)}
                              isLoading={!!sendingNodeReminder[`${selectedDiaryEntry.id}-${typeof node.node_order === 'number' ? node.node_order : index + 1}`]}
                              leftIcon={<RiIcons.RiNotification3Line />}
                            >
                              Reminder
                            </Button>
                          )}
                        </div>
                      </div>
                    )})}
                </div>
              </div>
            )}
            
            {/* Comments Section */}
            {selectedDiaryEntry.diary_comments && selectedDiaryEntry.diary_comments.length > 0 && (
              <div className="rounded-xl border border-secondary-200 bg-secondary-50/80 p-4 shadow-sm dark:border-dark-700 dark:bg-dark-800/80">
                <div className="flex items-center text-secondary-600 dark:text-secondary-400 mb-4">
                  <RiIcons.RiChat3Line className="mr-2 text-[#647f31] dark:text-[#b0c985]" />
                  <span className="text-sm font-medium uppercase tracking-wide">Comments & Actions</span>
                </div>
                
                <div className="space-y-3">
                  {selectedDiaryEntry.diary_comments
                    .sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
                    .map((comment: any) => (
                      <div key={comment.id} className="p-3 bg-secondary-50 dark:bg-dark-700 rounded-lg">
                        <div className="flex items-center justify-between mb-2">
                          <div className="font-medium text-secondary-900 dark:text-white">{comment.user_name}</div>
                          <div className="flex items-center space-x-2">
                            {comment.action && (
                              <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                comment.action === 'approve' ? 'bg-[#cbdcab] text-[#40501f] dark:bg-[#2f3a17]/40 dark:text-[#cbdcab]' :
                              comment.action === 'reject' ? 'bg-[#dbe5c4] text-[#526728] dark:bg-[#2f3a17]/40 dark:text-[#a4b986]' :
                              'bg-[#e2ebcf] text-[#526728] dark:bg-[#2f3a17]/30 dark:text-[#a4b986]'
                            }`}>
                                {comment.action.charAt(0).toUpperCase() + comment.action.slice(1)}
                              </span>
                            )}
                            <span className="text-xs text-secondary-500 dark:text-secondary-400">
                              {new Date(comment.created_at).toLocaleDateString()}
                            </span>
                          </div>
                        </div>
                        <div className="text-secondary-700 dark:text-secondary-300">{comment.comment}</div>
                      </div>
                    ))}
                </div>
              </div>
            )}
            
            <div className="mt-6 border-t border-secondary-200 pt-6 dark:border-dark-700">
              <div className="flex flex-col-reverse sm:flex-row sm:items-center justify-between gap-4">
                {/* Left side: Utility actions */}
                <div className="flex flex-wrap items-center gap-2 justify-center sm:justify-start">
                   <Button 
                    variant="ghost"
                    size="sm"
                    leftIcon={<RiIcons.RiDownload2Line />}
                    className="text-secondary-500 hover:text-secondary-800 dark:text-secondary-400 dark:hover:text-secondary-100"
                  >
                    {t('common.export')}
                  </Button>
                  <Button 
                    variant="ghost"
                    size="sm"
                    leftIcon={<RiIcons.RiPrinterLine />}
                    className="text-secondary-500 hover:text-secondary-800 dark:text-secondary-400 dark:hover:text-secondary-100"
                  >
                    {t('common.print')}
                  </Button>
                  
                  {/* Admin delete button */}
                  {user?.role === 'admin' && (
                    <Button 
                      variant="ghost"
                      size="sm"
                      leftIcon={<RiIcons.RiDeleteBinLine />}
                      onClick={() => {
                        setShowDetails(false);
                        handleDeleteEntry(selectedDiaryEntry);
                      }}
                      className="text-[#526728] hover:text-[#40501f] hover:bg-[#cbdcab]/30"
                    >
                      Delete
                    </Button>
                  )}
                </div>

                {/* Right side: Workflow actions */}
                <div className="flex flex-wrap items-center gap-2 justify-center sm:justify-end">
                  <Button 
                    variant="outline"
                    size="sm"
                    onClick={() => setShowDetails(false)}
                    className="dark:hover:bg-dark-800/90"
                  >
                    {t('common.close')}
                  </Button>

                  {/* View/Edit Form Button */}
                  <Button 
                    variant="outline"
                    size="sm"
                    leftIcon={canUserUpdateForm(selectedDiaryEntry) ? <RiIcons.RiEditLine /> : <RiIcons.RiFileListLine />}
                    onClick={() => {
                      setShowDetails(false);
                      setShowFormView(true);
                    }}
                    className="dark:hover:bg-dark-800/90"
                  >
                    {canUserUpdateForm(selectedDiaryEntry) ? 'Edit Form' : 'View Form'}
                  </Button>

                  {/* Workflow Action Buttons */}
                  {(selectedDiaryEntry.status === 'pending' || selectedDiaryEntry.status === 'rejected') && (
                    <>
                      {/* Send Back (if applicable) */}
                      {canUserApproveEntry(selectedDiaryEntry) && selectedDiaryEntry.current_node_index > 0 && (
                        <Button 
                          variant="outline"
                          size="sm"
                          leftIcon={<RiIcons.RiArrowLeftLine />}
                          onClick={() => handleWorkflowAction('back')}
                          className="border-[#a4b986] text-[#526728] hover:border-[#789a3b] hover:bg-[#f2f6e9] dark:border-[#789a3b]/30 dark:text-[#b0c985] dark:hover:bg-[#2f3a17]/20"
                        >
                          Send Back
                        </Button>
                      )}
                      
                      {/* Reject */}
                      {canUserApproveEntry(selectedDiaryEntry) && (
                        <Button 
                          variant="outline"
                          size="sm"
                          leftIcon={<RiIcons.RiCloseLine />}
                          onClick={() => handleWorkflowAction('reject')}
                          className="text-[#526728] border-[#789a3b]/40 hover:bg-[#cbdcab]/30 hover:border-[#789a3b]"
                        >
                          Reject
                        </Button>
                      )}

                      {/* Approve/Complete */}
                      {canUserApproveEntry(selectedDiaryEntry) && (
                        <Button 
                          variant="primary"
                          size="sm"
                          leftIcon={<RiIcons.RiCheckLine />}
                          onClick={() => handleWorkflowAction('approve')}
                          className="border-none bg-gradient-to-r from-[#647f31] to-[#526728] text-white shadow-lg shadow-[#40501f]/30 hover:from-[#526728] hover:to-[#40501f]"
                        >
                          {selectedDiaryEntry.current_node_index === 1 ? 'Complete' : 'Approve'}
                        </Button>
                      )}
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </Dialog>

      {/* History Dialog */}
      <Dialog
        isOpen={showHistory}
        onClose={() => setShowHistory(false)}
        title={t('diary.history') || 'Update History'}
        size="lg"
        className="w-full max-w-4xl border border-secondary-200/80 bg-white/95 shadow-2xl dark:border-dark-700 dark:bg-dark-900/95"
        disablePadding
      >
        {loadingHistory ? (
            <div className="flex justify-center p-8">
              <RiIcons.RiLoader4Line className="animate-spin text-3xl text-[#647f31]" />
            </div>
         ) : (
           <div className="space-y-4 max-h-[70vh] overflow-y-auto p-2">
             {historyData.length === 0 ? (
               <p className="text-center text-[#647f31] py-8">No history available for this entry.</p>
             ) : (
               historyData.map((history) => (
                 <div key={history.id} className="rounded-xl border border-secondary-200 bg-secondary-50/70 p-4 transition-shadow hover:shadow-md dark:border-dark-700 dark:bg-dark-800/60">
                   <div className="flex justify-between items-start mb-3">
                     <div className="flex items-center">
                       <div className="w-10 h-10 rounded-full bg-[#e2ebcf] dark:bg-[#2f3a17]/40 flex items-center justify-center text-[#647f31] dark:text-[#b0c985] mr-3">
                         <RiIcons.RiUser3Line />
                       </div>
                       <div>
                         <div className="font-semibold text-[#2f3a17] dark:text-[#dbe5c4]">
                           {history.users?.name || 'Unknown User'}
                         </div>
                         <div className="text-xs text-[#647f31] dark:text-[#a4b986]">
                           {history.users?.email}
                         </div>
                       </div>
                     </div>
                     <div className="text-right">
                       <div className="text-sm font-medium text-[#2f3a17] dark:text-[#dbe5c4]">
                         {new Date(history.changed_at).toLocaleDateString()}
                       </div>
                       <div className="text-xs text-[#647f31] dark:text-[#a4b986]">
                         {new Date(history.changed_at).toLocaleTimeString()}
                       </div>
                     </div>
                   </div>
                   
                   {/* Summary of changes if available */}
                   <div className="mb-4 space-y-2 rounded-lg border border-secondary-200 bg-white p-3 dark:border-dark-700 dark:bg-dark-900">
                     {history.form_data?.weather ? (
                       <div className="flex items-center text-sm text-[#526728] dark:text-[#b0c985]">
                         <span className="w-20 font-medium text-[#647f31] dark:text-[#a4b986]">Weather:</span>
                         <span className="flex items-center">
                            {getWeatherIcon(history.form_data.weather)}
                            <span className="ml-2">{history.form_data.weather}</span>
                         </span>
                       </div>
                     ) : null}
                     {history.form_data?.notes ? (
                       <div className="flex items-start text-sm text-[#526728] dark:text-[#b0c985]">
                         <span className="w-20 font-medium text-[#647f31] dark:text-[#a4b986] mt-0.5">Notes:</span>
                         <span className="line-clamp-2">{history.form_data.notes}</span>
                       </div>
                     ) : null}
                     
                     {/* Show raw data toggle or summary of other fields could go here */}
                     <div className="text-xs text-[#8ea56a] mt-2 italic">
                       {Object.keys(history.form_data || {}).length} fields recorded
                     </div>
                   </div>
 
                   <div className="flex justify-end space-x-2">
                     {user?.role === 'admin' && (
                       <Button
                         variant="outline"
                         size="sm"
                         onClick={() => handleRestore(history)}
                         leftIcon={<RiIcons.RiRefreshLine />}
                        className="text-[#526728] hover:bg-[#f2f6e9] hover:text-[#40501f] dark:text-[#b0c985] dark:hover:bg-[#2f3a17]/20 dark:hover:text-[#dbe5c4]"
                       >
                         Restore
                       </Button>
                     )}
                     <Button
                       variant="outline"
                       size="sm"
                        onClick={() => {
                          setSelectedHistoryEntry(history);
                          setShowHistoryForm(true);
                          setShowHistory(false); // Close history dialog to show form
                        }}
                        leftIcon={<RiIcons.RiFileListLine />}
                        className="w-full sm:w-auto"
                      >
                        View Form Snapshot
                      </Button>
                    </div>
                 </div>
               ))
             )}
           </div>
         )}
       </Dialog>

      {/* History Form View Modal */}
      {showHistoryForm && selectedHistoryEntry && (
        <AnimatePresence>
          <div 
            className="fixed inset-0 z-50 flex items-end justify-center bg-[#1f2710]/70 p-0 backdrop-blur-md sm:items-center sm:p-4"
            onClick={() => {
              setShowHistoryForm(false);
              setShowHistory(true); // Reopen history dialog
            }}
          >
            <motion.div
              className="h-[95dvh] w-full overflow-hidden rounded-t-2xl border border-[#cbdcab]/70 bg-gradient-to-b from-white to-[#f2f6e9]/90 shadow-2xl dark:border-dark-700 dark:from-dark-900 dark:to-dark-800 sm:h-auto sm:max-h-[92vh] sm:max-w-6xl sm:rounded-2xl"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.3 }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="sticky top-0 z-20 flex items-center justify-between border-b border-[#cbdcab]/70 bg-gradient-to-r from-[#1f2710] to-[#526728] px-4 py-3 text-white backdrop-blur-sm dark:border-dark-700">
                <div className="truncate pr-3 text-sm font-semibold text-white">
                  History Snapshot
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setShowHistoryForm(false);
                    setShowHistory(true);
                  }}
                  leftIcon={<RiIcons.RiCloseLine />}
                >
                  Close
                </Button>
              </div>
              <div className="max-h-[calc(95dvh-56px)] overflow-y-auto sm:max-h-[calc(92vh-56px)]">
              <SiteDiaryFormTemplate
                onClose={() => {
                  setShowHistoryForm(false);
                  setShowHistory(true); // Reopen history dialog
                }}
                onSave={() => {}} // No-op for history view
                initialData={selectedHistoryEntry.form_data}
                isEditMode={false}
                readOnly={true}
                title={`History Snapshot - ${new Date(selectedHistoryEntry.changed_at).toLocaleString()} by ${selectedHistoryEntry.users?.name || 'Unknown'}`}
              />
              </div>
            </motion.div>
          </div>
        </AnimatePresence>
      )}
       
       {/* Process Flow Configuration Modal */}
      {showProcessFlow && (
        <AnimatePresence>
          <div 
            className="fixed inset-0 z-50 flex items-end justify-center bg-[#1f2710]/70 p-0 backdrop-blur-md sm:items-center sm:p-4"
            onClick={handleCancelProcessFlow}
          >
            <motion.div
              className="h-[95dvh] w-full overflow-hidden rounded-t-2xl border border-[#cbdcab]/70 bg-gradient-to-b from-white to-[#f2f6e9]/90 shadow-2xl dark:border-dark-700 dark:from-dark-900 dark:to-dark-800 sm:h-auto sm:max-h-[92vh] sm:max-w-7xl sm:rounded-2xl"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.3 }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="sticky top-0 z-20 border-b border-secondary-200 bg-gradient-to-r from-[#1f2710] to-[#526728] px-4 py-4 text-white dark:border-dark-700 sm:px-6 sm:py-5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h2 className="flex items-center text-xl font-display font-bold sm:text-2xl">
                      <RiIcons.RiFlowChart className="mr-3" />
                      Process Configuration
                    </h2>
                    <p className="mt-1 text-sm text-[#dbe5c4] sm:text-base">
                      Configure the workflow process for this diary entry before saving.
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    onClick={handleCancelProcessFlow}
                    className="border-white/30 bg-white/10 text-white hover:bg-white/20"
                  >
                    <RiIcons.RiCloseLine className="text-xl" />
                  </Button>
                </div>
              </div>
              
              <div className="max-h-[calc(95dvh-70px)] overflow-y-auto p-4 sm:max-h-[calc(92vh-84px)] sm:p-6">
                <div className="grid grid-cols-1 gap-4 lg:grid-cols-12 lg:gap-6">
                  <div className="lg:col-span-5">
                    <Card className="h-full border border-secondary-200/70 p-4 dark:border-dark-700">
                      <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                        <h3 className="font-semibold text-secondary-900 dark:text-white">Process Flow</h3>
                        <Button 
                          variant="primary" 
                          size="sm"
                          leftIcon={<RiIcons.RiAddLine />}
                          onClick={addNewNode}
                        >
                          Add Node
                        </Button>
                      </div>
                      
                      <ProcessFlowBuilder 
                        nodes={processNodes}
                        onSelectNode={setSelectedNode}
                        selectedNodeId={selectedNode?.id || null}
                      />
                    </Card>
                  </div>
                  
                  <div className="lg:col-span-7">
                    <Card className="h-full border border-secondary-200/70 p-4 dark:border-dark-700">
                      <h3 className="font-semibold text-secondary-900 dark:text-white mb-4">Process Settings</h3>
                      <div className="mb-4 rounded-lg border border-secondary-200 p-3 dark:border-dark-700">
                        <h4 className="mb-3 text-sm font-semibold text-secondary-800 dark:text-secondary-200">
                          Diary Setup
                        </h4>
                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                          <Input
                            label="Project / Diary Name"
                            value={pendingDiaryName}
                            onChange={(e) => setPendingDiaryName(e.target.value)}
                            placeholder={selectedProject?.name || 'Enter diary name'}
                            className="bg-white/50 border border-white/10 backdrop-blur-md dark:bg-dark-800/50"
                          />
                          <div>
                            <label className="mb-1 block text-sm font-medium text-secondary-700 dark:text-secondary-300">
                              Expiry Date & Time
                            </label>
                            <input
                              type="datetime-local"
                              value={pendingDiaryExpiry}
                              onChange={(e) => setPendingDiaryExpiry(e.target.value)}
                              min={formatDateTimeLocal(new Date())}
                              className="input w-full border border-secondary-200 bg-white text-secondary-900 dark:border-dark-600 dark:bg-dark-700 dark:text-white"
                            />
                          </div>
                        </div>
                      </div>
                      
                      {selectedNode ? (
                        <div className="space-y-4">
                          <Input
                            label="Node name"
                            value={selectedNode.name || ''}
                            onChange={(e) => {
                              const updatedNode = { ...selectedNode, name: e.target.value };
                              const updatedNodes = processNodes.map(node => 
                                node.id === selectedNode.id ? updatedNode : node
                              );
                              setProcessNodes(updatedNodes);
                              setSelectedNode(updatedNode);
                            }}
                            className="bg-white/50 dark:bg-dark-800/50 backdrop-blur-md border border-white/10"
                          />
                          
                          {selectedNode.type === 'node' && (
                            <>
                              <div>
                                <label className="block text-sm font-medium text-secondary-700 dark:text-secondary-300 mb-2">
                                  Executor
                                </label>
                                <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                                  <div className="flex-grow bg-secondary-50 dark:bg-dark-700 border border-secondary-200 dark:border-dark-600 rounded p-3 text-secondary-600 dark:text-secondary-400">
                                    {selectedNode.executor || 'Select executor'}
                                  </div>
                                  <Button variant="outline" size="sm" onClick={() => openPeopleSelector('executor')}>
                                    Select
                                  </Button>
                                </div>
                              </div>
                              
                              <div>
                                <label className="block text-sm font-medium text-secondary-700 dark:text-secondary-300 mb-2">
                                  CC Recipients
                                </label>
                                <div className="flex flex-col space-y-2">
                                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                                    <div className="flex-grow bg-secondary-50 dark:bg-dark-700 border border-secondary-200 dark:border-dark-600 rounded p-3 min-h-[50px]">
                                      {selectedNode.ccRecipients && selectedNode.ccRecipients.length > 0 ? (
                                        <div className="flex flex-wrap gap-2">
                                          {selectedNode.ccRecipients.map(cc => (
                                            <div 
                                              key={cc.id} 
                                              className="flex items-center rounded-full bg-[#e2ebcf] px-3 py-1 text-sm text-[#526728] dark:bg-[#2f3a17]/40 dark:text-[#b0c985]"
                                            >
                                              <span className="mr-2">{cc.name}</span>
                                              <button
                                                type="button"
                                                className="text-[#789a3b] hover:text-[#526728] dark:text-[#b0c985] dark:hover:text-[#dbe5c4]"
                                                onClick={() => removeUserFromCc(cc.id)}
                                              >
                                                <RiIcons.RiCloseLine />
                                              </button>
                                            </div>
                                          ))}
                                        </div>
                                      ) : (
                                        <span className="text-secondary-500 dark:text-secondary-400">No CCs selected</span>
                                      )}
                                    </div>
                                    <Button 
                                      variant="outline" 
                                      size="sm" 
                                      onClick={() => openPeopleSelector('cc')}
                                    >
                                      Add CC
                                    </Button>
                                  </div>
                                  
                                  {selectedNode.ccRecipients && selectedNode.ccRecipients.length > 0 && (
                                    <div className="text-xs text-secondary-500 dark:text-secondary-400 flex items-center">
                                      <RiIcons.RiTeamLine className="mr-1" />
                                      {selectedNode.ccRecipients.length} {selectedNode.ccRecipients.length === 1 ? 'person' : 'people'} will be notified
                                    </div>
                                  )}
                                </div>
                              </div>
                              
                              <div>
                                <label className="block text-sm font-medium text-secondary-700 dark:text-secondary-300 mb-2">
                                  Edit Access
                                </label>
                                <div className="flex items-center space-x-3">
                                  <label className="flex items-center">
                                    <input
                                      type="checkbox"
                                      checked={selectedNode.editAccess !== false}
                                      onChange={(e) => {
                                        const updatedNode = { ...selectedNode, editAccess: e.target.checked };
                                        const updatedNodes = processNodes.map(node => 
                                          node.id === selectedNode.id ? updatedNode : node
                                        );
                                        setProcessNodes(updatedNodes);
                                        setSelectedNode(updatedNode);
                                      }}
                                      className="mr-2 rounded border-secondary-300 dark:border-dark-600"
                                    />
                                    <span className="text-sm text-secondary-700 dark:text-secondary-300">
                                      Allow editing when this node is active
                                    </span>
                                  </label>
                                </div>
                                <p className="text-xs text-secondary-500 dark:text-secondary-400 mt-1">
                                  When enabled, both executor and CC recipients can edit the form when this node is active
                                </p>
                              </div>

                              {/* Expire Time Configuration */}
                              <div>
                                <label className="block text-sm font-medium text-secondary-700 dark:text-secondary-300 mb-2">
                                  Task Expiration
                                </label>
                                <div className="space-y-3">
                                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                                    <select 
                                      value={selectedNode.expireTime === 'unlimited' || !selectedNode.expireTime ? 'unlimited' : 'custom'}
                                      onChange={(e) => {
                                        const value = e.target.value;
                                        const updatedNode = { 
                                          ...selectedNode, 
                                          expireTime: value === 'unlimited' ? 'unlimited' : '',
                                          expireDuration: value === 'unlimited' ? null : (selectedNode.expireDuration || 24)
                                        };
                                        const updatedNodes = processNodes.map(node => 
                                          node.id === selectedNode.id ? updatedNode : node
                                        );
                                        setProcessNodes(updatedNodes);
                                        setSelectedNode(updatedNode);
                                      }}
                                      className="flex-1 rounded border border-secondary-200 bg-white p-2 text-secondary-900 dark:border-dark-600 dark:bg-dark-700 dark:text-white"
                                    >
                                      <option value="unlimited">Unlimited</option>
                                      <option value="custom">Custom Date & Time</option>
                                    </select>
                                  </div>
                                  
                                  {(selectedNode.expireTime !== 'unlimited' && selectedNode.expireTime !== undefined) && (
                                    <div className="space-y-2">
                                      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                                        <input
                                          type="datetime-local"
                                          value={selectedNode.expireTime && selectedNode.expireTime !== 'unlimited' ? 
                                            (selectedNode.expireTime.includes('T') ? selectedNode.expireTime.slice(0, 16) : '') : ''}
                                          onChange={(e) => {
                                            const updatedNode = { 
                                              ...selectedNode, 
                                              expireTime: e.target.value ? new Date(e.target.value).toISOString() : '',
                                              expireDuration: null
                                            };
                                            const updatedNodes = processNodes.map(node => 
                                              node.id === selectedNode.id ? updatedNode : node
                                            );
                                            setProcessNodes(updatedNodes);
                                            setSelectedNode(updatedNode);
                                          }}
                                          min={new Date().toISOString().slice(0, 16)}
                                          className="flex-1 rounded border border-secondary-200 bg-white p-2 text-secondary-900 dark:border-dark-600 dark:bg-dark-700 dark:text-white"
                                        />
                                      </div>
                                      <p className="text-xs text-secondary-500 dark:text-secondary-400">
                                        Select the date and time when this task should expire
                                      </p>
                                    </div>
                                  )}
                                  
                                  <p className="text-xs text-secondary-500 dark:text-secondary-400">
                                    {selectedNode.expireTime === 'unlimited' 
                                      ? 'This task will not expire automatically.'
                                      : selectedNode.expireTime && selectedNode.expireTime !== 'unlimited'
                                        ? `This task will expire on ${new Date(selectedNode.expireTime).toLocaleString()}`
                                        : 'Select a custom expiration date and time above.'
                                    }
                                  </p>
                                </div>
                              </div>
                            </>
                          )}
                        </div>
                      ) : (
                        <div className="text-center py-8 text-secondary-500 dark:text-secondary-400">
                          <RiIcons.RiFlowChart className="text-4xl mx-auto mb-2 opacity-50" />
                          <p>Select a node to configure its settings</p>
                        </div>
                      )}
                    </Card>
                  </div>
                </div>
                
                <div className="sticky bottom-0 mt-4 border-t border-[#cbdcab]/70 bg-gradient-to-r from-white/95 to-[#f2f6e9]/95 pt-4 backdrop-blur-sm dark:border-dark-700 dark:from-dark-900/95 dark:to-dark-800/95 sm:mt-6 sm:pt-6">
                  <div className="flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <Button 
                    variant="outline"
                    leftIcon={<RiIcons.RiArrowLeftLine />}
                    onClick={handleCancelProcessFlow}
                    className="w-full sm:w-auto"
                  >
                    Back to Form
                  </Button>
                  
                  <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:space-x-0">
                    <Button 
                      variant="outline"
                      onClick={handleCancelProcessFlow}
                      className="w-full sm:w-auto"
                    >
                      Cancel
                    </Button>
                    <Button
                      variant="primary"
                      leftIcon={<RiIcons.RiCheckLine />}
                      onClick={handleFinalSave}
                      className="w-full bg-gradient-to-r from-[#647f31] to-[#526728] hover:from-[#526728] hover:to-[#40501f] sm:w-auto"
                    >
                      Save Diary Entry
                    </Button>
                  </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </AnimatePresence>
      )}

      <ReportModal
        isOpen={showReport}
        onClose={() => setShowReport(false)}
        title="Diary Full Report"
        subtitle="Includes all currently listed diary entries with visuals, trends, and detailed tables."
        onDownload={handleDownloadReportPdf}
        isDownloading={isDownloadingReport}
        contentRef={reportContentRef}
        maxWidthClassName="max-w-[1700px]"
        theme={{
          headerGradient: 'from-[#1f2710] to-[#526728]',
          bodyBackground: 'bg-[#f2f6e9]/45 dark:bg-dark-800/20'
        }}
      >
        <FullReportContent
          generatedOn={new Date().toLocaleString()}
          projectName={selectedProject?.name || 'All Projects'}
          summaryCards={[
            { label: 'Total Listed', value: reportEntries.length },
            { label: 'Pending', value: reportStatusCounts.pending },
            { label: 'Completed', value: reportStatusCounts.completed },
            { label: 'Rejected', value: reportStatusCounts.rejected },
            { label: 'Permanent Rejected', value: reportStatusCounts.permanentlyRejected },
            { label: 'Incidents Logged', value: incidentEntries.length }
          ]}
          reportHighlights={reportHighlights}
          statusChartTitle="Status Distribution"
          trendChartTitle="Entries Over Time"
          contributorChartTitle="Top Contributors"
          weatherChartTitle="Weather Distribution"
          statusChartData={statusChartData}
          trendChartData={trendChartData}
          contributorChartData={contributorChartData}
          weatherChartData={weatherChartData}
          chartOptions={chartOptions}
          issueSectionTitle="Incident Details"
          issueColumns={[
            { key: 'date', label: 'Date' },
            { key: 'author', label: 'Author' },
            { key: 'project', label: 'Project' },
            { key: 'incidents_reported', label: 'Incident' }
          ]}
          issueRows={incidentEntries}
          issueEmptyText="No incidents found in the currently listed entries."
          listSectionTitle="Full Diary List"
          listColumns={[
            { key: 'date', label: 'Date' },
            { key: 'project', label: 'Project' },
            { key: 'author', label: 'Author' },
            { key: 'weather', label: 'Weather' },
            { key: 'temperature', label: 'Temp' },
            { key: 'status', label: 'Status' },
            { key: 'work_completed', label: 'Work Completed' },
            { key: 'materials_delivered', label: 'Materials' },
            { key: 'notes', label: 'Notes' }
          ]}
          listRows={reportEntries}
          theme={{
            cardBorder: 'border-[#dbe5c4] dark:border-dark-700',
            cardSurface: 'bg-[#f7faef] dark:bg-dark-800',
            accentText: 'text-[#647f31]',
            numberText: 'text-[#2f3a17] dark:text-[#dbe5c4]'
          }}
        />
      </ReportModal>
      
      {/* People Selector Modal */}
      <PeopleSelectorModal
        isOpen={showPeopleSelector}
        onClose={() => setShowPeopleSelector(false)}
        onSelect={handleUserSelection}
        title={peopleSelectorType === 'executor' ? 'Select Executor' : 'Add CC Recipient'}
        users={users}
        loading={loadingUsers}
      />

      {/* Form View Modal */}
      {showFormView && selectedDiaryEntry && (
        <AnimatePresence>
          <div 
            className="fixed inset-0 z-50 flex items-end justify-center bg-[#1f2710]/70 p-0 backdrop-blur-md sm:items-center sm:p-4"
            onClick={() => setShowFormView(false)}
          >
            <motion.div
              className="h-[95dvh] w-full overflow-hidden rounded-t-2xl border border-[#cbdcab]/70 bg-gradient-to-b from-white to-[#f2f6e9]/90 shadow-2xl dark:border-dark-700 dark:from-dark-900 dark:to-dark-800 sm:h-auto sm:max-h-[92vh] sm:max-w-6xl sm:rounded-2xl"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.3 }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="sticky top-0 z-20 flex items-center justify-between border-b border-[#cbdcab]/70 bg-gradient-to-r from-[#1f2710] to-[#526728] px-4 py-3 text-white backdrop-blur-sm dark:border-dark-700">
                <div className="truncate pr-3 text-sm font-semibold text-white">
                  {canUserEditEntry(selectedDiaryEntry) ? 'Edit Diary Entry' : canUserUpdateForm(selectedDiaryEntry) ? 'Update Diary Entry' : 'View Diary Entry'}
                </div>
                <Button variant="ghost" size="sm" onClick={() => setShowFormView(false)} leftIcon={<RiIcons.RiCloseLine />}>
                  Close
                </Button>
              </div>
              <div className="max-h-[calc(95dvh-56px)] overflow-y-auto sm:max-h-[calc(92vh-56px)]">
              <SiteDiaryFormTemplate
                onClose={() => setShowFormView(false)}
                onSave={handleFormUpdate}
                initialData={selectedDiaryEntry.form_data}
                isEditMode={canUserEditEntry(selectedDiaryEntry) || canUserUpdateForm(selectedDiaryEntry)}
                readOnly={!canUserEditEntry(selectedDiaryEntry) && !canUserUpdateForm(selectedDiaryEntry)}
                title={`${
                  canUserEditEntry(selectedDiaryEntry) ? 'Edit' : 
                  canUserUpdateForm(selectedDiaryEntry) ? 'Update' : 
                  'View'
                } Diary Entry - ${selectedDiaryEntry.date}`}
              />
              </div>
            </motion.div>
          </div>
        </AnimatePresence>
      )}
    </div>
  );
};

export default DiaryPage; 
