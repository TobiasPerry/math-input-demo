import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  deleteProblem,
  listProblems,
  listProblemsByType,
  updateProblem,
  type ProblemRecord,
  type ProblemType,
} from '../utils/validationApi';

type FilterType = ProblemType | 'all';

interface EditFormState {
  title: string;
  description: string;
  type: ProblemType;
  equationsText: string;
  expression: string;
  metadataText: string;
}

const problemTypes: ProblemType[] = ['substitution', 'simplify', 'factor', 'arithmetic'];

const isEquationType = (type: ProblemType) => type === 'substitution';

const mapProblemRecordToProblemData = (problem: ProblemRecord) => {
  const data = problem.problemData || {};
  return {
    type: problem.type,
    title: problem.title ?? data.title,
    description: problem.description ?? data.description,
    equations: data.equations ?? problem.equations,
    expression: data.expression ?? problem.expression,
  };
};

const buildEditState = (problem: ProblemRecord): EditFormState => {
  const data = problem.problemData || {};
  return {
    title: problem.title ?? data.title ?? '',
    description: problem.description ?? data.description ?? '',
    type: problem.type,
    equationsText: (data.equations ?? problem.equations ?? []).join('\n'),
    expression: data.expression ?? problem.expression ?? '',
    metadataText: JSON.stringify(data.metadata ?? problem.metadata ?? {}, null, 2),
  };
};

const ProblemBrowser = () => {
  const navigate = useNavigate();

  const [problems, setProblems] = useState<ProblemRecord[]>([]);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(10);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [filterType, setFilterType] = useState<FilterType>('all');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editingCode, setEditingCode] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<EditFormState | null>(null);
  const [savingCode, setSavingCode] = useState<string | null>(null);
  const [deletingCode, setDeletingCode] = useState<string | null>(null);

  const fetchProblems = async () => {
    setLoading(true);
    setError(null);
    try {
      const response =
        filterType === 'all'
          ? await listProblems(page, pageSize)
          : await listProblemsByType(filterType, page, pageSize);

      setProblems(response.items || []);
      setTotalPages(response.total_pages || 1);
      setTotalCount(response.total_count || 0);
    } catch (err) {
      console.error('Failed to load problems', err);
      setError(err instanceof Error ? err.message : 'Unable to load problems.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchProblems();
  }, [page, filterType]);

  const startEdit = (problem: ProblemRecord) => {
    setEditingCode(problem.problem_code);
    setEditForm(buildEditState(problem));
  };

  const cancelEdit = () => {
    setEditingCode(null);
    setEditForm(null);
  };

  const handleSaveEdit = async () => {
    if (!editingCode || !editForm) {
      return;
    }

    let metadata: Record<string, any> | undefined = undefined;
    if (editForm.metadataText.trim()) {
      try {
        metadata = JSON.parse(editForm.metadataText);
      } catch (err) {
        setError('Metadata must be valid JSON.');
        return;
      }
    }

    const equations = editForm.equationsText
      .split('\n')
      .map(eq => eq.trim())
      .filter(Boolean);

    const payload: Partial<ProblemRecord> = {
      title: editForm.title.trim() || undefined,
      description: editForm.description.trim() || undefined,
      type: editForm.type,
      metadata,
    };

    if (equations.length > 0) {
      payload.equations = equations;
    }

    if (editForm.expression.trim()) {
      payload.expression = editForm.expression.trim();
    }

    setSavingCode(editingCode);
    setError(null);
    try {
      const updated = await updateProblem(editingCode, payload);
      setProblems(prev =>
        prev.map(problem => (problem.problem_code === editingCode ? updated : problem))
      );
      cancelEdit();
    } catch (err) {
      console.error('Update failed', err);
      setError(err instanceof Error ? err.message : 'Failed to update problem.');
    } finally {
      setSavingCode(null);
    }
  };

  const handleDelete = async (problemCode: string) => {
    setDeletingCode(problemCode);
    setError(null);
    try {
      await deleteProblem(problemCode);
      setProblems(prev => prev.filter(problem => problem.problem_code !== problemCode));
    } catch (err) {
      console.error('Delete failed', err);
      setError(err instanceof Error ? err.message : 'Failed to delete problem.');
    } finally {
      setDeletingCode(null);
    }
  };

  const handleOpen = (problem: ProblemRecord) => {
    const data = mapProblemRecordToProblemData(problem);
    navigate('/problem-chat', {
      state: { problem: data },
    });
  };

  const handleRefresh = () => {
    setPage(1);
    void fetchProblems();
  };

  const paginationLabel = useMemo(() => {
    const start = (page - 1) * pageSize + 1;
    const end = Math.min(page * pageSize, totalCount);
    return totalCount > 0 ? `${start}-${end} of ${totalCount}` : '0 results';
  }, [page, pageSize, totalCount]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ flex: '1 1 200px' }}>
          <label style={{ display: 'block', marginBottom: '0.35rem', fontWeight: 'bold' }}>
            Filter by type
          </label>
          <select
            value={filterType}
            onChange={(e) => {
              setFilterType(e.target.value as FilterType);
              setPage(1);
            }}
            style={{
              width: '100%',
              padding: '0.6rem',
              borderRadius: '6px',
              border: '1px solid rgba(255, 255, 255, 0.2)',
              backgroundColor: 'rgba(0, 0, 0, 0.3)',
              color: 'white',
            }}
          >
            <option value="all">All types</option>
            {problemTypes.map(type => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </select>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'flex-end' }}>
          <button
            onClick={handleRefresh}
            style={{
              padding: '0.65rem 1rem',
              backgroundColor: '#2196f3',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              minWidth: '120px',
            }}
          >
            🔄 Refresh
          </button>
          <span style={{ color: 'rgba(255, 255, 255, 0.8)', fontSize: '0.9rem' }}>
            {paginationLabel}
          </span>
        </div>
      </div>

      {error && (
        <div
          style={{
            padding: '0.75rem 1rem',
            backgroundColor: 'rgba(244, 67, 54, 0.15)',
            border: '1px solid rgba(244, 67, 54, 0.35)',
            borderRadius: '6px',
            color: '#ff9e9e',
          }}
        >
          {error}
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        {loading && (
          <div style={{ color: 'rgba(255, 255, 255, 0.8)' }}>Loading problems…</div>
        )}

        {!loading && problems.length === 0 && (
          <div style={{ color: 'rgba(255, 255, 255, 0.8)' }}>
            No problems found. Try refreshing or creating one above.
          </div>
        )}

        {problems.map(problem => {
          const isEditing = editingCode === problem.problem_code;
          return (
            <div
              key={problem.problem_code}
              style={{
                padding: '1rem',
                borderRadius: '8px',
                border: '1px solid rgba(255, 255, 255, 0.15)',
                backgroundColor: 'rgba(0, 0, 0, 0.25)',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: '0.5rem',
                  gap: '0.75rem',
                }}
              >
                <div>
                  <div style={{ fontWeight: 'bold', fontSize: '1rem' }}>
                    {problem.title || '(Untitled)'}
                  </div>
                  <div style={{ fontSize: '0.9rem', color: 'rgba(255, 255, 255, 0.7)' }}>
                    {problem.problem_code} · {problem.type}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '0.5rem', flexShrink: 0 }}>
                  <button
                    onClick={() => handleOpen(problem)}
                    style={{
                      padding: '0.4rem 0.75rem',
                      backgroundColor: '#4caf50',
                      color: 'white',
                      border: 'none',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      fontSize: '0.9rem',
                    }}
                  >
                    ▶ Open
                  </button>
                  <button
                    onClick={() => (isEditing ? cancelEdit() : startEdit(problem))}
                    style={{
                      padding: '0.4rem 0.75rem',
                      backgroundColor: '#ffc107',
                      color: '#0a0a0a',
                      border: 'none',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      fontSize: '0.9rem',
                    }}
                  >
                    {isEditing ? 'Cancel' : 'Edit'}
                  </button>
                  <button
                    onClick={() => handleDelete(problem.problem_code)}
                    disabled={deletingCode === problem.problem_code}
                    style={{
                      padding: '0.4rem 0.75rem',
                      backgroundColor: '#f44336',
                      color: 'white',
                      border: 'none',
                      borderRadius: '6px',
                      cursor: deletingCode === problem.problem_code ? 'not-allowed' : 'pointer',
                      fontSize: '0.9rem',
                      opacity: deletingCode === problem.problem_code ? 0.7 : 1,
                    }}
                  >
                    {deletingCode === problem.problem_code ? 'Deleting…' : 'Delete'}
                  </button>
                </div>
              </div>

              {!isEditing && (
                <div style={{ color: 'rgba(255, 255, 255, 0.85)', fontSize: '0.95rem' }}>
                  {problem.description || 'No description'}
                </div>
              )}

              {isEditing && editForm && (
                <div style={{ marginTop: '0.75rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                    <div style={{ flex: '1 1 220px' }}>
                      <label style={{ display: 'block', marginBottom: '0.35rem', fontWeight: 'bold' }}>
                        Title
                      </label>
                      <input
                        type="text"
                        value={editForm.title}
                        onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
                        style={{
                          width: '100%',
                          padding: '0.65rem',
                          borderRadius: '6px',
                          border: '1px solid rgba(255, 255, 255, 0.2)',
                          backgroundColor: 'rgba(0, 0, 0, 0.3)',
                          color: 'white',
                        }}
                      />
                    </div>
                    <div style={{ flex: '1 1 180px' }}>
                      <label style={{ display: 'block', marginBottom: '0.35rem', fontWeight: 'bold' }}>
                        Type
                      </label>
                      <select
                        value={editForm.type}
                        onChange={(e) =>
                          setEditForm({ ...editForm, type: e.target.value as ProblemType })
                        }
                        style={{
                          width: '100%',
                          padding: '0.65rem',
                          borderRadius: '6px',
                          border: '1px solid rgba(255, 255, 255, 0.2)',
                          backgroundColor: 'rgba(0, 0, 0, 0.3)',
                          color: 'white',
                        }}
                      >
                        {problemTypes.map(type => (
                          <option key={type} value={type}>
                            {type}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div>
                    <label style={{ display: 'block', marginBottom: '0.35rem', fontWeight: 'bold' }}>
                      Description
                    </label>
                    <textarea
                      value={editForm.description}
                      onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                      rows={2}
                      style={{
                        width: '100%',
                        padding: '0.65rem',
                        borderRadius: '6px',
                        border: '1px solid rgba(255, 255, 255, 0.2)',
                        backgroundColor: 'rgba(0, 0, 0, 0.3)',
                        color: 'white',
                        resize: 'vertical',
                      }}
                    />
                  </div>

                  {isEquationType(editForm.type) ? (
                    <div>
                      <label style={{ display: 'block', marginBottom: '0.35rem', fontWeight: 'bold' }}>
                        Equations (one per line)
                      </label>
                      <textarea
                        value={editForm.equationsText}
                        onChange={(e) => setEditForm({ ...editForm, equationsText: e.target.value })}
                        rows={3}
                        style={{
                          width: '100%',
                          padding: '0.65rem',
                          borderRadius: '6px',
                          border: '1px solid rgba(255, 255, 255, 0.2)',
                          backgroundColor: 'rgba(0, 0, 0, 0.3)',
                          color: 'white',
                          fontFamily: 'monospace',
                        }}
                      />
                    </div>
                  ) : (
                    <div>
                      <label style={{ display: 'block', marginBottom: '0.35rem', fontWeight: 'bold' }}>
                        Expression
                      </label>
                      <input
                        type="text"
                        value={editForm.expression}
                        onChange={(e) => setEditForm({ ...editForm, expression: e.target.value })}
                        style={{
                          width: '100%',
                          padding: '0.65rem',
                          borderRadius: '6px',
                          border: '1px solid rgba(255, 255, 255, 0.2)',
                          backgroundColor: 'rgba(0, 0, 0, 0.3)',
                          color: 'white',
                          fontFamily: 'monospace',
                        }}
                      />
                    </div>
                  )}

                  <div>
                    <label style={{ display: 'block', marginBottom: '0.35rem', fontWeight: 'bold' }}>
                      Metadata (JSON)
                    </label>
                    <textarea
                      value={editForm.metadataText}
                      onChange={(e) => setEditForm({ ...editForm, metadataText: e.target.value })}
                      rows={3}
                      style={{
                        width: '100%',
                        padding: '0.65rem',
                        borderRadius: '6px',
                        border: '1px solid rgba(255, 255, 255, 0.2)',
                        backgroundColor: 'rgba(0, 0, 0, 0.3)',
                        color: 'white',
                        fontFamily: 'monospace',
                      }}
                    />
                  </div>

                  <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                    <button
                      onClick={handleSaveEdit}
                      disabled={savingCode === problem.problem_code}
                      style={{
                        padding: '0.5rem 0.9rem',
                        backgroundColor: '#4caf50',
                        color: 'white',
                        border: 'none',
                        borderRadius: '6px',
                        cursor: savingCode === problem.problem_code ? 'not-allowed' : 'pointer',
                        fontSize: '0.9rem',
                        opacity: savingCode === problem.problem_code ? 0.7 : 1,
                      }}
                    >
                      {savingCode === problem.problem_code ? 'Saving…' : 'Save'}
                    </button>
                    <button
                      onClick={cancelEdit}
                      style={{
                        padding: '0.5rem 0.9rem',
                        backgroundColor: 'rgba(255, 255, 255, 0.1)',
                        color: 'white',
                        border: '1px solid rgba(255, 255, 255, 0.2)',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        fontSize: '0.9rem',
                      }}
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {totalPages > 1 && (
        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', justifyContent: 'flex-end' }}>
          <button
            onClick={() => setPage(Math.max(1, page - 1))}
            disabled={page <= 1}
            style={{
              padding: '0.45rem 0.9rem',
              backgroundColor: '#646cff',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: page <= 1 ? 'not-allowed' : 'pointer',
              opacity: page <= 1 ? 0.6 : 1,
            }}
          >
            ← Prev
          </button>
          <div style={{ color: 'rgba(255, 255, 255, 0.8)' }}>
            Page {page} / {totalPages}
          </div>
          <button
            onClick={() => setPage(Math.min(totalPages, page + 1))}
            disabled={page >= totalPages}
            style={{
              padding: '0.45rem 0.9rem',
              backgroundColor: '#646cff',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: page >= totalPages ? 'not-allowed' : 'pointer',
              opacity: page >= totalPages ? 0.6 : 1,
            }}
          >
            Next →
          </button>
        </div>
      )}
    </div>
  );
};

export default ProblemBrowser;
