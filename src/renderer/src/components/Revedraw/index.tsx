import { useCallback, useEffect, useRef, useState } from 'react';
import { RevenoteFile } from '@renderer/types/file';
import { Revedraw } from 'revemate';
import { canvasIndexeddbStorage } from '@renderer/store/canvasIndexeddb';
import { useDebounceFn } from 'ahooks';
import { Button, Modal } from 'antd';
import CustomFontModal from '../CustomFontModal';

import './index.css';

interface Props {
  file: RevenoteFile;
}

const DEFAULT_DATA_SOURCE = '{}';

export default function Handraw({ file }: Props) {
  const [dataSource, setDataSource] = useState<string>();
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);

  const getDataSource = useCallback(async (id) => {
    setDataSource(undefined);

    const data = await canvasIndexeddbStorage.getCanvas(id);

    console.log('getDataSource', data);

    setDataSource(data || DEFAULT_DATA_SOURCE);
  }, []);

  const onChangeFn = useCallback(
    async (data) => {
      console.log('--- onchange ---', data);

      const str = JSON.stringify(data);

      await canvasIndexeddbStorage.addOrUpdateCanvas(file.id, str);
    },
    [file.id]
  );

  const { run: onChangeDebounceFn, cancel: cancelDebounceFn } = useDebounceFn(onChangeFn, {
    wait: 200
  });

  useEffect(() => {
    getDataSource(file.id);
    return () => {
      console.log('--- cancel ---', cancelDebounceFn);
      cancelDebounceFn();
    };
  }, [file.id]);

  return dataSource ? (
    <>
      <Revedraw
        dataSource={dataSource}
        canvasName={file.name}
        onChange={onChangeDebounceFn}
        customMenuItems={[
          <Button
            key="load-custom-fonts"
            title="Add Custom Fonts"
            onClick={() => setIsModalOpen(true)}
          >
            custom font size
          </Button>
        ]}
      />
      <CustomFontModal open={isModalOpen} closeModal={() => setIsModalOpen(false)} />
    </>
  ) : null;
}
