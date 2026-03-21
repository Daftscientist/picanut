import React, { useState } from 'react';
import { Rnd } from 'react-rnd';
import {
  Trash2,
  Type,
  Barcode,
  QrCode,
  DollarSign,
  Minus,
  Save,
  Maximize2,
  Settings2,
  Undo2
} from 'lucide-react';
import { clsx } from 'clsx';
import toast from 'react-hot-toast';

interface LabelElement {
  id: string;
  type: 'text' | 'barcode' | 'qrcode' | 'price' | 'separator';
  content: string;
  x: number;
  y: number;
  width: number;
  height: number;
  fontSize: number;
  fontWeight: string;
}

const DEFAULT_ELEMENTS: LabelElement[] = [
  { id: '1', type: 'text', content: 'Product Name', x: 20, y: 20, width: 200, height: 30, fontSize: 18, fontWeight: 'bold' },
  { id: '2', type: 'barcode', content: '12345678', x: 20, y: 60, width: 200, height: 80, fontSize: 12, fontWeight: 'normal' },
  { id: '3', type: 'price', content: '$99.99', x: 230, y: 20, width: 100, height: 30, fontSize: 20, fontWeight: 'bold' },
];

export default function LabelDesigner() {
  const [elements, setElements] = useState<LabelElement[]>(DEFAULT_ELEMENTS);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const canvasSize = { width: 400, height: 250 }; // 100mm x 60mm approx

  const selectedElement = elements.find(el => el.id === selectedId);

  const addElement = (type: LabelElement['type']) => {
    const newElement: LabelElement = {
      id: Math.random().toString(36).substr(2, 9),
      type,
      content: type === 'text' ? 'New Text' : type === 'price' ? '$0.00' : '12345678',
      x: 50,
      y: 50,
      width: type === 'separator' ? 300 : 150,
      height: type === 'separator' ? 2 : 40,
      fontSize: 14,
      fontWeight: 'normal',
    };
    setElements([...elements, newElement]);
    setSelectedId(newElement.id);
  };

  const updateElement = (id: string, updates: Partial<LabelElement>) => {
    setElements(elements.map(el => el.id === id ? { ...el, ...updates } : el));
  };

  const removeElement = (id: string) => {
    setElements(elements.filter(el => el.id !== id));
    if (selectedId === id) setSelectedId(null);
  };

  const handleSave = () => {
    toast.success('Template saved successfully!');
    console.log('Saving template:', { elements, canvasSize });
  };

  return (
    <div className="page-body m-0 p-0 overflow-hidden" style={{ height: 'calc(100vh - 120px)' }}>
      <div className="container-fluid h-100 p-0">
        <div className="row g-0 h-100">
          {/* Left Sidebar - Toolset */}
          <div className="col-auto bg-white border-end shadow-sm d-flex flex-column p-3" style={{ width: '280px' }}>
            <div className="mb-4">
               <h3 className="fw-bold d-flex align-items-center gap-2 mb-1">
                 <Settings2 size={18} className="text-primary" />
                 Label Designer
               </h3>
               <p className="text-muted small">Add and arrange elements on your label.</p>
            </div>

            <div className="space-y-2 flex-grow-1">
              <div className="text-uppercase small fw-bold text-muted mb-2 ls-wider">Elements</div>
              <button onClick={() => addElement('text')} className="btn btn-outline-primary w-100 justify-content-start py-3 mb-2 border-dashed">
                <Type size={18} className="me-2" /> Text Field
              </button>
              <button onClick={() => addElement('barcode')} className="btn btn-outline-primary w-100 justify-content-start py-3 mb-2 border-dashed">
                <Barcode size={18} className="me-2" /> Barcode
              </button>
              <button onClick={() => addElement('qrcode')} className="btn btn-outline-primary w-100 justify-content-start py-3 mb-2 border-dashed">
                <QrCode size={18} className="me-2" /> QR Code
              </button>
              <button onClick={() => addElement('price')} className="btn btn-outline-primary w-100 justify-content-start py-3 mb-2 border-dashed">
                <DollarSign size={18} className="me-2" /> Price Tag
              </button>
              <button onClick={() => addElement('separator')} className="btn btn-outline-primary w-100 justify-content-start py-3 mb-2 border-dashed">
                <Minus size={18} className="me-2" /> Separator Line
              </button>
            </div>

            <div className="mt-auto pt-3 border-top">
              <button onClick={handleSave} className="btn btn-primary w-100 py-2 shadow-sm d-flex align-items-center justify-content-center gap-2">
                <Save size={18} /> Save Template
              </button>
            </div>
          </div>

          {/* Main Canvas Area */}
          <div className="col bg-light d-flex align-items-center justify-content-center p-4 position-relative overflow-auto">
            <div className="position-absolute top-4 start-4 d-flex gap-2">
               <div className="badge bg-white text-dark border p-2 shadow-sm d-flex align-items-center gap-2">
                 <Maximize2 size={14} className="text-muted" />
                 {canvasSize.width} x {canvasSize.height} px
               </div>
            </div>

            <div
              className="bg-white shadow-2xl border position-relative"
              style={{
                width: canvasSize.width,
                height: canvasSize.height,
                boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.15)'
              }}
              onClick={() => setSelectedId(null)}
            >
              {elements.map((el) => (
                <Rnd
                  key={el.id}
                  size={{ width: el.width, height: el.height }}
                  position={{ x: el.x, y: el.y }}
                  onDragStop={(_, d) => updateElement(el.id, { x: d.x, y: d.y })}
                  onResizeStop={(_1, _2, ref, _3, position) => {
                    updateElement(el.id, {
                      width: parseInt(ref.style.width),
                      height: parseInt(ref.style.height),
                      ...position,
                    });
                  }}
                  bounds="parent"
                  onClick={(e: React.MouseEvent) => {
                    e.stopPropagation();
                    setSelectedId(el.id);
                  }}
                  className={clsx(
                    "d-flex align-items-center justify-content-center border transition-all cursor-move",
                    selectedId === el.id ? "border-primary border-2 shadow-sm" : "border-transparent hover-border-gray-300"
                  )}
                >
                  {el.type === 'text' && (
                    <div style={{ fontSize: el.fontSize, fontWeight: el.fontWeight as any }}>{el.content}</div>
                  )}
                  {el.type === 'price' && (
                    <div className="fw-bold" style={{ fontSize: el.fontSize }}>{el.content}</div>
                  )}
                  {el.type === 'barcode' && (
                    <div className="w-100 h-100 bg-light d-flex flex-column align-items-center justify-content-center p-1 border">
                      <Barcode size={32} className="text-dark opacity-50" />
                      <div className="small text-muted mt-1" style={{ fontSize: '8px' }}>{el.content}</div>
                    </div>
                  )}
                  {el.type === 'qrcode' && (
                    <div className="w-100 h-100 bg-light d-flex align-items-center justify-content-center p-1 border">
                      <QrCode size={32} className="text-dark opacity-50" />
                    </div>
                  )}
                  {el.type === 'separator' && (
                    <div className="w-100 bg-dark" style={{ height: '2px' }}></div>
                  )}
                </Rnd>
              ))}
            </div>
          </div>

          {/* Right Sidebar - Properties */}
          <div className="col-auto bg-white border-start shadow-sm p-4 d-flex flex-column" style={{ width: '320px' }}>
            <div className="text-uppercase small fw-bold text-muted mb-4 ls-wider d-flex align-items-center justify-content-between">
               Properties
               {selectedElement && (
                 <button onClick={() => removeElement(selectedElement.id)} className="btn btn-ghost-danger btn-icon btn-sm border-0">
                   <Trash2 size={16} />
                 </button>
               )}
            </div>

            {selectedElement ? (
              <div className="space-y-4">
                <div className="mb-3">
                  <label className="form-label small fw-bold">Content</label>
                  <input
                    type="text"
                    className="form-control form-control-sm"
                    value={selectedElement.content}
                    onChange={(e) => updateElement(selectedElement.id, { content: e.target.value })}
                  />
                </div>

                <div className="row g-2 mb-3">
                  <div className="col-6">
                    <label className="form-label small fw-bold">Font Size</label>
                    <input
                      type="number"
                      className="form-control form-control-sm"
                      value={selectedElement.fontSize}
                      onChange={(e) => updateElement(selectedElement.id, { fontSize: parseInt(e.target.value) })}
                    />
                  </div>
                  <div className="col-6">
                    <label className="form-label small fw-bold">Weight</label>
                    <select
                      className="form-select form-select-sm"
                      value={selectedElement.fontWeight}
                      onChange={(e) => updateElement(selectedElement.id, { fontWeight: e.target.value })}
                    >
                      <option value="normal">Normal</option>
                      <option value="medium">Medium</option>
                      <option value="bold">Bold</option>
                      <option value="black">Black</option>
                    </select>
                  </div>
                </div>

                <div className="row g-2 mb-3">
                   <div className="col-6">
                      <label className="form-label small fw-bold">X Position</label>
                      <input
                        type="number"
                        className="form-control form-control-sm"
                        value={Math.round(selectedElement.x)}
                        onChange={(e) => updateElement(selectedElement.id, { x: parseInt(e.target.value) })}
                      />
                   </div>
                   <div className="col-6">
                      <label className="form-label small fw-bold">Y Position</label>
                      <input
                        type="number"
                        className="form-control form-control-sm"
                        value={Math.round(selectedElement.y)}
                        onChange={(e) => updateElement(selectedElement.id, { y: parseInt(e.target.value) })}
                      />
                   </div>
                </div>

                <div className="pt-4 border-top">
                   <div className="d-flex align-items-center gap-2 text-muted small">
                     <Undo2 size={14} />
                     Click and drag elements on the canvas to move or resize them.
                   </div>
                </div>
              </div>
            ) : (
              <div className="empty flex-grow-1 d-flex flex-column align-items-center justify-content-center text-center p-4">
                <div className="empty-img mb-3 opacity-20">
                  <Type size={64} />
                </div>
                <p className="empty-title text-muted fw-medium">No element selected</p>
                <p className="empty-subtitle small text-muted">Select an element on the canvas to edit its properties.</p>
              </div>
            )}

            <div className="mt-auto pt-4 border-top">
               <div className="card bg-blue-lt border-0 rounded-3">
                  <div className="card-body p-3">
                    <h4 className="card-title mb-2 fw-bold text-primary small">Pro Tip</h4>
                    <p className="card-text small text-primary opacity-75">Use separators to create sections on your label for a professional look.</p>
                  </div>
               </div>
            </div>
          </div>
        </div>
      </div>
      <style>{`
        .hover-border-gray-300:hover { border-color: #dee2e6 !important; }
        .ls-wider { letter-spacing: 0.05em; }
        .space-y-2 > * + * { margin-top: 0.5rem; }
        .space-y-4 > * + * { margin-top: 1rem; }
        .border-dashed { border-style: dashed !important; }
        .shadow-2xl { box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25); }
      `}</style>
    </div>
  );
}
