

import { useState, useRef, useEffect } from "react";
import * as nifti from "nifti-reader-js";

const NiftiViewer = () => {
  const [niftiHeader, setNiftiHeader] = useState(null);
  const [niftiImage, setNiftiImage] = useState(null);
  const [slice, setSlice] = useState(0);
  const [zoom, setZoom] = useState(false);
  const [selection, setSelection] = useState(null);
  const canvasRef = useRef(null);

  const handleFileSelect = (event) => {
    const file = event.target.files[0];
    const reader = new FileReader();

    reader.onloadend = (evt) => {
      if (evt.target.readyState === FileReader.DONE) {
        const data = evt.target.result;
        if (nifti.isCompressed(data)) {
          const decompressed = nifti.decompress(data);
          parseNifti(decompressed);
        } else {
          parseNifti(data);
        }
      }
    };

    reader.readAsArrayBuffer(file);
  };

  const parseNifti = (data) => {
    if (nifti.isNIFTI(data)) {
      const header = nifti.readHeader(data);
      const image = nifti.readImage(header, data);
      setNiftiHeader(header);
      setNiftiImage(image);
      setSlice(Math.round(header.dims[3] / 2));
    }
  };

  const drawCanvas = () => {
    if (!niftiHeader || !niftiImage) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    const cols = niftiHeader.dims[1];
    const rows = niftiHeader.dims[2];
    const sliceSize = cols * rows;
    const sliceOffset = sliceSize * slice;
    const imageData = ctx.createImageData(cols, rows);

    let typedData;

    switch (niftiHeader.datatypeCode) {
      case nifti.NIFTI1.TYPE_UINT8:
        typedData = new Uint8Array(niftiImage);
        break;
      case nifti.NIFTI1.TYPE_INT16:
        typedData = new Int16Array(niftiImage);
        break;
      case nifti.NIFTI1.TYPE_INT32:
        typedData = new Int32Array(niftiImage);
        break;
      case nifti.NIFTI1.TYPE_FLOAT32:
        typedData = new Float32Array(niftiImage);
        break;
      case nifti.NIFTI1.TYPE_FLOAT64:
        typedData = new Float64Array(niftiImage);
        break;
      case nifti.NIFTI1.TYPE_INT8:
        typedData = new Int8Array(niftiImage);
        break;
      case nifti.NIFTI1.TYPE_UINT16:
        typedData = new Uint16Array(niftiImage);
        break;
      case nifti.NIFTI1.TYPE_UINT32:
        typedData = new Uint32Array(niftiImage);
        break;
      default:
        return;
    }

    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        const offset = sliceOffset + row * cols + col;
        const value = typedData[offset];
        const index = (row * cols + col) * 4;
        imageData.data[index] = value & 0xff;
        imageData.data[index + 1] = value & 0xff;
        imageData.data[index + 2] = value & 0xff;
        imageData.data[index + 3] = 0xff;
      }
    }

    ctx.putImageData(imageData, 0, 0);

    if (selection && zoom) {
      const [x, y, width, height] = selection;
      const zoomedData = ctx.getImageData(x, y, width, height);
      const zoomedCanvas = document.createElement("canvas");
      zoomedCanvas.width = canvas.width;
      zoomedCanvas.height = canvas.height;
      const zoomedCtx = zoomedCanvas.getContext("2d");
      zoomedCtx.putImageData(zoomedData, 0, 0);
      zoomedCtx.drawImage(zoomedCanvas, 0, 0, canvas.width, canvas.height);
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(zoomedCanvas, 0, 0);
    }
  };

  const handleMouseDown = (e) => {
    if (!zoom) return;
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const startX = e.clientX - rect.left;
    const startY = e.clientY - rect.top;
    setSelection([startX, startY, 0, 0]);
  };

  const handleMouseMove = (e) => {
    if (!zoom || !selection) return;
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const [startX, startY] = selection;
    const currentX = e.clientX - rect.left;
    const currentY = e.clientY - rect.top;
    setSelection([startX, startY, currentX - startX, currentY - startY]);
  };

  const handleMouseUp = () => {
    if (!zoom || !selection) return;
    drawCanvas();
  };

  useEffect(() => {
    drawCanvas();
  }, [slice, niftiHeader, niftiImage, selection]);

  return (
    <div>
      <div style={{ fontFamily: "sans-serif" }}>
        <h3>NIFTI-Reader-JS </h3>
        <p>
          Select a file: <input type="file" onChange={handleFileSelect} />
        </p>
        <hr />
      </div>
      <div>
        <canvas
          ref={canvasRef}
          width="512"
          height="512"
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
        ></canvas>
        <br />
        <input
          type="range"
          min="0"
          max={niftiHeader ? niftiHeader.dims[3] - 1 : 100}
          value={slice}
          onChange={(e) => setSlice(Number(e.target.value))}
        />
        <br />
        <button onClick={() => setZoom(!zoom)}>
          {zoom ? "Disable Zoom" : "Enable Zoom"}
        </button>
      </div>
    </div>
  );
};

export default NiftiViewer;
