import { useCallback } from 'react';
import { FileEdit, Trash2, ClipboardCopy } from 'lucide-react';
import { EditableTextState } from '@renderer/types/menu';
import { useTranslation } from 'react-i18next';
import { RevezoneFile, RevezoneFolder } from '@renderer/types/file';

interface Props {
  editableTextState: EditableTextState;
  updateEditableTextState: (
    id: string,
    value: boolean,
    editableTextState: EditableTextState
  ) => void;
  deleteFile: (file: RevezoneFile, folderId: string) => void;
}

export default function useFileContextMenu(props: Props) {
  const { editableTextState, updateEditableTextState, deleteFile } = props;
  const { t } = useTranslation();

  const getFileContextMenu = useCallback(
    (file: RevezoneFile, folder: RevezoneFolder) => [
      {
        key: 'rename',
        label: t('operation.rename'),
        icon: <FileEdit className="w-4" />,
        onClick: ({ domEvent }) => {
          domEvent.stopPropagation();
          console.log('rename');
          updateEditableTextState(file.id, false, editableTextState);
        }
      },
      {
        key: 'delete',
        label: t('operation.delete'),
        icon: <Trash2 className="w-4"></Trash2>,
        onClick: () => {
          console.log('delete', file.id, folder.id);
          deleteFile(file, folder.id);
        }
      },
      {
        key: 'copy_revezone_link',
        label: t('operation.copyRevezoneLink'),
        icon: <ClipboardCopy className="w-4" />,
        onClick: ({ domEvent }) => {
          domEvent.stopPropagation();
          navigator.clipboard.writeText(`revezone://${file.id}`);
        }
      }
    ],
    []
  );

  return [getFileContextMenu];
}
