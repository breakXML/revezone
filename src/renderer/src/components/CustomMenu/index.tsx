import { useCallback, useEffect, useMemo, useState } from 'react';
import { Menu, Dropdown } from 'antd';
import type { MenuProps } from 'antd';
import { FolderIcon, DocumentPlusIcon, TrashIcon } from '@heroicons/react/24/outline';
import { indexeddbStorage, RevenoteFolder, RevenoteFile } from '@renderer/store/indexeddb';
import {
  getOpenKeysFromLocal,
  getSelectedKeysFromLocal,
  setCurrentFileIdToLocal,
  setOpenKeysToLocal,
  setSelectedKeysToLocal
} from '@renderer/store/localstorage';
import { useAtom } from 'jotai';
import { currentFileIdAtom, currentFileAtom } from '@renderer/store/jotai';
import EditableText from '../EditableText';
import { blocksuiteStorage } from '@renderer/store/blocksuite';
import useBlocksuitePageTitle from '@renderer/hooks/useBlocksuitePageTitle';

import './index.css';

const FILE_ID_REGEX = /^([a-zA-Z0-9-]+)______.*/;

interface Props {
  collapsed: boolean;
}

export default function CustomMenu({ collapsed }: Props) {
  const [folderList, setFolderList] = useState<RevenoteFolder[] | undefined>([]);
  const [filesInFolder, setFilesInFolder] = useState<RevenoteFile[]>();
  const [openKeys, setOpenKeys] = useState<string[]>(getOpenKeysFromLocal());
  const [selectedKeys, setSelectedKeys] = useState<string[]>(getSelectedKeysFromLocal());
  const [currentFileId, setCurrentFileId] = useAtom(currentFileIdAtom);
  const [, setCurrentFile] = useAtom(currentFileAtom);
  const [pageTitle] = useBlocksuitePageTitle();
  const [currentFolderId, setCurrentFolderId] = useState<string>();

  const getCurrentFolderId = useCallback((folders) => {
    let currentFolderId: string | undefined = openKeys?.filter(
      (key) => !!folders?.find((folder) => folder.id === key)
    )?.[0];

    if (!currentFolderId) {
      currentFolderId = folders?.[0].id;
    }

    return currentFolderId;
  }, []);

  const getFolders = useCallback(async () => {
    const folders = await indexeddbStorage.getFolders();
    setFolderList(folders);

    const currentFolderId = getCurrentFolderId(folders);

    if (currentFolderId) {
      getFilesInFolder(currentFolderId);
      setOpenKeys([currentFolderId]);
    }
  }, [indexeddbStorage]);

  const getFilesInFolder = useCallback(async (folderId: string) => {
    if (!folderId) {
      return;
    }

    const filesInFolder = await indexeddbStorage.getFilesInFolder(folderId);

    setFilesInFolder(filesInFolder);

    const currentFile = filesInFolder?.[0];

    if (!currentFile) {
      return;
    }

    return filesInFolder;
  }, []);

  useEffect(() => {
    !collapsed && getFolders();
  }, [indexeddbStorage, collapsed]);

  useEffect(() => {
    setSelectedKeysToLocal(selectedKeys);
  }, [selectedKeys]);

  useEffect(() => {
    setCurrentFolderId(openKeys?.[0]);
  }, [openKeys?.[0]]);

  useEffect(() => {
    const file = filesInFolder?.find((_file) => _file.id === currentFileId);

    setCurrentFile(file);
  }, [currentFileId, filesInFolder]);

  useEffect(() => {
    if (currentFileId) {
      setCurrentFileIdToLocal(currentFileId);
    }
  }, [currentFileId]);

  const updateFileNameInMenu = useCallback(async () => {
    if (!currentFileId || pageTitle === undefined) {
      return;
    }
    console.log('--- pageTitle ---', pageTitle);
    await indexeddbStorage.updateFileName(currentFileId, pageTitle);
    currentFolderId && (await getFilesInFolder(currentFolderId));
    setSelectedKeys([`${currentFileId}______${pageTitle}`]);
  }, [pageTitle, currentFileId, currentFolderId]);

  useEffect(() => {
    updateFileNameInMenu();
  }, [pageTitle, currentFileId, currentFolderId]);

  const addFile = useCallback(
    async (folderId: string) => {
      const file = await indexeddbStorage.addFile(folderId, 'markdown');
      await getFilesInFolder(folderId);
      setCurrentFileId(file.id);
    },
    [indexeddbStorage]
  );

  const deleteFile = useCallback(
    async (fileId: string, folderId: string) => {
      await indexeddbStorage.deleteFile(fileId);
      const files = await getFilesInFolder(folderId);

      setCurrentFileId(files?.[0]?.id);
      await blocksuiteStorage.deletePage(fileId);
    },
    [indexeddbStorage]
  );

  const onOpenChange = useCallback((keys) => {
    setOpenKeys(keys);
    setOpenKeysToLocal(keys);
  }, []);

  const onSelect = useCallback(({ key }) => {
    const fileId = key?.match(FILE_ID_REGEX)?.[1];
    setCurrentFileId(fileId);
    setSelectedKeys([key]);
  }, []);

  const folderMenu: MenuProps['items'] = useMemo(
    () => [
      {
        key: 'rename',
        label: 'rename',
        onClick: () => {
          console.log('rename');
        }
      },
      {
        key: 'delete',
        label: 'delete',
        onClick: () => {
          console.log('delete');
        }
      }
    ],
    []
  );

  const getFileMenu = useCallback(
    (file, folder) => [
      {
        key: 'rename',
        label: 'rename',
        onClick: () => {
          console.log('rename');
        }
      },
      {
        key: 'delete',
        label: (
          <div className="flex items-center justify-between">
            <TrashIcon className="h-4 w-4" />
            <span className="ml-2">Delete</span>
          </div>
        ),
        onClick: () => {
          console.log('delete');
          deleteFile(file.id, folder.id);
        }
      }
    ],
    []
  );

  const onFileNameChange = useCallback((text, fileId) => {
    blocksuiteStorage.updatePageTitle(text, fileId);

    console.log('onFileNameChange', text);

    indexeddbStorage.updateFileName(fileId, text);
  }, []);

  return (
    <div className="revenote-menu-container">
      <Menu
        theme="light"
        mode="inline"
        selectedKeys={selectedKeys}
        openKeys={openKeys}
        onOpenChange={onOpenChange}
        onSelect={onSelect}
        style={{ border: 'none' }}
        items={folderList?.map((folder) => ({
          key: folder.id,
          icon: <FolderIcon className="h-4 w-4" />,
          label: (
            <Dropdown menu={{ items: folderMenu }} trigger={['contextMenu']}>
              <div className="flex items-center justify-between">
                <span>{folder.name}</span>
                <DocumentPlusIcon
                  className="h-4 w-4 text-current cursor-pointer mr-4 menu-icon"
                  onClick={(e) => {
                    e.stopPropagation();
                    addFile(folder.id);
                  }}
                />
              </div>
            </Dropdown>
          ),
          children: filesInFolder?.map((file) => {
            return {
              key: `${file.id}______${file.name}`,
              label: (
                <Dropdown menu={{ items: getFileMenu(file, folder) }} trigger={['contextMenu']}>
                  <div className="flex items-center justify-between">
                    <EditableText
                      text={file.name}
                      defaultText="Utitled"
                      onChange={(text) => onFileNameChange(text, file.id)}
                    />
                  </div>
                </Dropdown>
              )
            };
          })
        }))}
      />
    </div>
  );
}
