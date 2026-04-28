import { getSupabaseClient } from '../lib/supabase';

export interface ModelRecord {
  id: string;
  user_id: string;
  file_url: string;
  file_name: string;
  status: string;
  step?: string;
  progress?: number;
  error?: string;
  user_name?: string;
  file_id?: number;
  project_id?: string;
  token?: string;
  thumbnail?: string;
  viewtoken?: string;
  databag_id?: string;
  created_at?: string;
  updated_at?: string;
}

// Get all models (admin only)
export const getAllModels = async (): Promise<ModelRecord[]> => {
  try {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from('bim_process_logs')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching all models:', error);
      throw error;
    }

    return data || [];
  } catch (error) {
    console.error('Error in getAllModels:', error);
    throw error;
  }
};

// Get models for a specific project
export const getProjectModelsFromSupabase = async (projectId: string): Promise<ModelRecord[]> => {
  try {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from('bim_process_logs')
      .select('*')
      .eq('project_id', projectId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching project models:', error);
      throw error;
    }

    return data || [];
  } catch (error) {
    console.error('Error in getProjectModelsFromSupabase:', error);
    throw error;
  }
};

// Get all models for the current user
export const getUserModels = async (userId: string): Promise<ModelRecord[]> => {
  try {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from('bim_process_logs')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching user models:', error);
      throw error;
    }

    return data || [];
  } catch (error) {
    console.error('Error in getUserModels:', error);
    throw error;
  }
};
