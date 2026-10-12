'use client';

import { useEffect, useState } from 'react';
import { AdminThumb } from '@/components/admin/ui';

export function AdminImageUploader({ path, alt, onPreview }: { path: string; alt: string; onPreview?: (src: string) => void }) {
  const [current, setCurrent] = useState(path);
  const [preview, setPreview] = useState(path);
  function show(src: string) {
    setPreview(src);
    onPreview?.(src);
  }

  useEffect(() => {
    return () => {
      if (preview.startsWith('blob:')) URL.revokeObjectURL(preview);
    };
  }, [preview]);

  return (
    <div className="admin-uploader">
      <AdminThumb src={preview} alt={alt} large />
      <label>
        Image address
        <input name="image" value={current} onChange={(event) => { setCurrent(event.target.value); show(event.target.value); }} placeholder="/food/sides.jpg" />
      </label>
      <label>
        Upload a replacement
        <input
          name="file"
          type="file"
          accept="image/jpeg,image/png,image/webp"
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (!file) return;
            if (preview.startsWith('blob:')) URL.revokeObjectURL(preview);
            show(URL.createObjectURL(file));
          }}
        />
      </label>
      <p className="admin-muted">JPEG, PNG, or WebP. 2 MB maximum. The current image stays until you save.</p>
    </div>
  );
}
