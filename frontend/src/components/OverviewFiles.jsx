import { useRef, useState } from 'react';
import { Upload, FileText, Download, Trash2, LoaderCircle, FolderOpen, HardDrive } from 'lucide-react';
import { Button } from './ui/button';
import { deleteFile, downloadFile, fileSize, MAX_FILE_SIZE, saveFile } from '../services/files';

export function OverviewFiles({ dashboard }) {
  const { site, reports } = dashboard;
  const { files, loading } = reports;
  const input = useRef(null);
  const [busy, setBusy] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  async function insertFiles(selection) {
    if (busy || loading || !selection.length) return;
    setBusy(true);
    setError('');
    setMessage('');
    const saved = [], errors = [];
    for (const file of Array.from(selection)) {
      if (file.size > MAX_FILE_SIZE) {
        errors.push(`${file.name}: exceeds the 20 MB limit.`);
        continue;
      }
      try {
        saved.push(await saveFile(site.id, file));
      } catch {
        errors.push(`${file.name}: could not save. Browser storage may be full or unavailable.`);
      }
    }
    reports.reload(saved.map(file => file.id).reverse());
    if (saved.length) setMessage(`${saved.length} ${saved.length === 1 ? 'file' : 'files'} saved for ${site.name}.`);
    setError(errors.join(' '));
    setBusy(false);
    if (input.current) input.current.value = '';
  }

  async function remove(file) {
    setBusy(true);
    setError('');
    try {
      await deleteFile(file.id);
      reports.reload();
      setMessage(`${file.name} removed from this workspace.`);
    } catch {
      setError('This file could not be removed. Please try again.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="panel overview-files" aria-labelledby="overview-files-title">
      <div className="panel-heading">
        <div>
          <h2 id="overview-files-title"><FolderOpen size={17}/>Your files <span className="count-badge">{files.length}</span></h2>
          <p>Insert a Search Console CSV or Excel export to automatically show your keywords and performance.</p>
        </div>
        <Button disabled={loading || busy} onClick={() => input.current?.click()}>
          {busy ? <LoaderCircle size={15} className="file-spinner"/> : <Upload size={15}/>}
          {busy ? 'Saving…' : 'Insert files'}
        </Button>
      </div>
      <input ref={input} className="overview-file-input" type="file" multiple aria-label="Insert files into Overview" onChange={event => insertFiles(event.target.files)}/>
      <button
        className={`file-dropzone ${dragging ? 'dragging' : ''}`}
        disabled={loading || busy}
        onClick={() => input.current?.click()}
        onDragOver={event => { event.preventDefault(); setDragging(true); }}
        onDragLeave={event => { if (!event.currentTarget.contains(event.relatedTarget)) setDragging(false); }}
        onDrop={event => { event.preventDefault(); setDragging(false); insertFiles(event.dataTransfer.files); }}
      >
        <span className="soft-icon"><Upload size={21}/></span>
        <strong>Drop your files here, or <span>browse files</span></strong>
        <span>CSV and XLSX reports are analysed automatically · up to 20 MB each</span>
      </button>
      {loading && <p className="files-feedback" role="status">Reading files and updating your performance…</p>}
      {message && <p className="files-feedback success" role="status">{message}</p>}
      {(error || reports.error) && <div className="files-error" role="alert"><p>{error || reports.error}</p><Button variant="ghost" size="sm" disabled={busy || loading} onClick={() => reports.reload()}>Reload saved files</Button></div>}
      {files.length > 0 && (
        <ul className="file-list" aria-label="Saved files">
          {files.map(file => (
            <li className="file-entry" key={file.id}>
              <span className="file-type-icon"><FileText size={19}/></span>
              <div className="file-details"><strong title={file.name}>{file.name}</strong><span>{fileSize(file.size)} · Added {new Date(file.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                {reports.results[file.id]?.report && <span className="file-import-success">{reports.activeId === file.id ? 'Active report' : 'Ready to analyse'} · {new Set(reports.results[file.id].report.queryRows.map(row => row.query)).size} keywords</span>}
                {reports.results[file.id]?.error && <span className="file-import-error" role="alert">{reports.results[file.id].error}</span>}
                {reports.results[file.id]?.attachment && <span>Attachment only · use a GSC CSV or XLSX export for analytics</span>}
              </div>
              {reports.results[file.id]?.report && reports.activeId !== file.id && <Button variant="outline" size="sm" disabled={loading || busy} onClick={() => reports.select(file.id)}>Use report</Button>}
              <Button variant="outline" size="icon" aria-label={`Download ${file.name}`} onClick={() => downloadFile(file)}><Download size={15}/></Button>
              <Button variant="ghost" size="icon" disabled={busy || loading} aria-label={`Remove ${file.name}`} onClick={() => remove(file)}><Trash2 size={15}/></Button>
            </li>
          ))}
        </ul>
      )}
      <div className="files-storage-note"><HardDrive size={13}/><span>CSV/XLSX performance reports update the dashboard automatically. Other files stay as attachments. Saved locally in this browser; clearing browser data removes files.</span></div>
    </section>
  );
}
