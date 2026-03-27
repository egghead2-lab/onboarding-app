export type UserRole = 'admin' | 'team' | 'candidate'

export type Profile = {
  id: string
  email: string
  full_name: string | null
  role: UserRole
  created_at: string
}

export type Candidate = {
  id: string
  profile_id: string | null
  full_name: string
  email: string
  phone: string | null
  status: 'pending' | 'in_progress' | 'complete' | 'rejected'
  assigned_to: string | null
  created_at: string
  updated_at: string
  assignee?: Profile | null
}

export type Requirement = {
  id: string
  title: string
  description: string | null
  requires_document: boolean
  category: string | null
  sort_order: number
  created_at: string
}

export type CandidateRequirement = {
  id: string
  candidate_id: string
  requirement_id: string
  completed: boolean
  completed_at: string | null
  completed_by: string | null
  notes: string | null
  requirement?: Requirement
}

export type Task = {
  id: string
  candidate_id: string
  assigned_to: string | null
  created_by: string | null
  title: string
  description: string | null
  due_date: string | null
  completed: boolean
  completed_at: string | null
  created_at: string
  assignee?: Profile | null
}

export type Document = {
  id: string
  candidate_id: string
  requirement_id: string | null
  file_name: string
  storage_path: string
  uploaded_at: string
}
