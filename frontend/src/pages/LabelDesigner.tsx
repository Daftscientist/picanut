import { useState } from 'react';
import { Rnd } from 'react-rnd';
import { Barcode, DollarSign, Minus, QrCode, Save, Trash2, Type } from 'lucide-react';
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
  { id: '3', type: 'price', content: '$99.99', x: 240, y: 20, width: 100, height: 30, fontSize: 20, fontWeight: 'bold' },
];

export default function LabelDesigner() {
  const [elements, setElements] = useState<LabelElement[]>(DEFAULT_ELEMENTS);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const canvasSize = { width: 400, height: 250 };

  const selectedElement = elements.find((element) => element.id === selectedId);

  const addElement = (type: LabelElement['type']) => {
    const newElement: LabelElement = {
      id: Math.random().toString(36).slice(2, 11),
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
    setElements(elements.map((element) => (element.id === id ? { ...element, ...updates } : element)));
  };

  const removeElement = (id: string) => {
    setElements(elements.filter((element) => element.id !== id));
    if (selectedId === id) setSelectedId(null);
  };

  const handleSave = () => {
    toast.success('Template saved successfully');
    console.log('Saving template:', { elements, canvasSize });
  };

  return (
    <div className="mock-page">
      <div className="mock-page__grid mock-page__grid--designer">
        <div className="mock-page__main mock-page__main--designer">
          <section className="mock-surface">
            <div className="mock-surface__header">
              <div>
                <h2>Shape the Printable Canvas</h2>
                <p>Arrange text, pricing, and codes in a cleaner layout without dropping into the older hero-style editor frame.</p>
              </div>
              <button type="button" className="mock-action-solid" onClick={handleSave}>
                <Save size={14} />
                Save Template
              </button>
            </div>
          </section>

          <div className="mock-designer">
            <section className="mock-rail-card">
              <div className="mock-rail-card__header">
                <strong>Add Elements</strong>
              </div>
              <div className="mock-list">
                <button type="button" className="mock-toolbar-button" onClick={() => addElement('text')}>
                  <Type size={15} />
                  Text Field
                </button>
                <button type="button" className="mock-toolbar-button" onClick={() => addElement('barcode')}>
                  <Barcode size={15} />
                  Barcode
                </button>
                <button type="button" className="mock-toolbar-button" onClick={() => addElement('qrcode')}>
                  <QrCode size={15} />
                  QR Code
                </button>
                <button type="button" className="mock-toolbar-button" onClick={() => addElement('price')}>
                  <DollarSign size={15} />
                  Price Mark
                </button>
                <button type="button" className="mock-toolbar-button" onClick={() => addElement('separator')}>
                  <Minus size={15} />
                  Separator
                </button>
              </div>
            </section>

            <section className="mock-surface mock-surface--padded">
              <div className="canvas-stage">
                <div className="canvas-sheet" style={{ width: canvasSize.width, height: canvasSize.height }} onClick={() => setSelectedId(null)}>
              {elements.map((element) => (
                <Rnd
                  key={element.id}
                  size={{ width: element.width, height: element.height }}
                  position={{ x: element.x, y: element.y }}
                  onDragStop={(_, data) => updateElement(element.id, { x: data.x, y: data.y })}
                  onResizeStop={(_event, _direction, ref, _delta, position) => {
                    updateElement(element.id, {
                      width: parseInt(ref.style.width, 10),
                      height: parseInt(ref.style.height, 10),
                      ...position,
                    });
                  }}
                  bounds="parent"
                  onClick={(event: React.MouseEvent) => {
                    event.stopPropagation();
                    setSelectedId(element.id);
                  }}
                  style={{
                    borderRadius: 10,
                    boxShadow: selectedId === element.id ? '0 0 0 2px rgba(47, 105, 75, 0.28)' : '0 0 0 1px rgba(84, 97, 90, 0.08)',
                    background: element.type === 'separator' ? 'transparent' : '#fff',
                    overflow: 'hidden',
                  }}
                >
                  {element.type === 'text' ? (
                    <div style={{ fontSize: element.fontSize, fontWeight: element.fontWeight as any, padding: 8 }}>{element.content}</div>
                  ) : null}
                  {element.type === 'price' ? (
                    <div style={{ fontSize: element.fontSize, fontWeight: 700, padding: 8 }}>{element.content}</div>
                  ) : null}
                  {element.type === 'barcode' ? (
                    <div className="data-row" style={{ height: '100%', borderRadius: 0 }}>
                      <div>
                        <strong>Barcode</strong>
                        <span>{element.content}</span>
                      </div>
                    </div>
                  ) : null}
                  {element.type === 'qrcode' ? (
                    <div className="data-row" style={{ height: '100%', borderRadius: 0 }}>
                      <div>
                        <strong>QR code</strong>
                        <span>Square payload</span>
                      </div>
                    </div>
                  ) : null}
                  {element.type === 'separator' ? <div style={{ width: '100%', height: 2, background: '#191c1e', marginTop: '50%' }} /> : null}
                </Rnd>
              ))}
                </div>
              </div>
            </section>

            <section className="mock-rail-card">
              <div className="mock-rail-card__header">
                <strong>{selectedElement ? 'Selected Element' : 'Nothing Selected'}</strong>
              </div>
              {selectedElement ? (
                <div className="mock-meta-list">
                  <label className="canopy-field">
                    <span>Content</span>
                    <input
                      className="canopy-input--plain"
                      type="text"
                      value={selectedElement.content}
                      onChange={(event) => updateElement(selectedElement.id, { content: event.target.value })}
                    />
                  </label>
                <label className="canopy-field">
                  <span>Font size</span>
                  <input
                    className="canopy-input--plain"
                    type="number"
                    value={selectedElement.fontSize}
                    onChange={(event) => updateElement(selectedElement.id, { fontSize: parseInt(event.target.value, 10) })}
                  />
                </label>
                <label className="canopy-field">
                  <span>Weight</span>
                  <select value={selectedElement.fontWeight} onChange={(event) => updateElement(selectedElement.id, { fontWeight: event.target.value })}>
                    <option value="normal">Normal</option>
                    <option value="medium">Medium</option>
                    <option value="bold">Bold</option>
                    <option value="black">Black</option>
                  </select>
                </label>
                <label className="canopy-field">
                  <span>X position</span>
                  <input
                    className="canopy-input--plain"
                    type="number"
                    value={Math.round(selectedElement.x)}
                    onChange={(event) => updateElement(selectedElement.id, { x: parseInt(event.target.value, 10) })}
                  />
                </label>
                <label className="canopy-field">
                  <span>Y position</span>
                  <input
                    className="canopy-input--plain"
                    type="number"
                    value={Math.round(selectedElement.y)}
                    onChange={(event) => updateElement(selectedElement.id, { y: parseInt(event.target.value, 10) })}
                  />
                </label>
                  <button type="button" className="mock-toolbar-button" onClick={() => removeElement(selectedElement.id)}>
                    <Trash2 size={15} />
                    Remove Element
                  </button>
                </div>
              ) : (
                <div className="mock-meta-list">
                  <div>
                    <strong>Select an element</strong>
                    <span>Click an item on the canvas to edit its properties.</span>
                  </div>
                </div>
              )}
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}
