import type { PayloadAction, SliceCaseReducers } from '@reduxjs/toolkit';
import { moveOneToEnd, moveOneToStart, moveToEnd, moveToStart } from 'common/util/arrayUtils';
import { getPrefixedId } from 'features/controlLayers/konva/util';
import type { IRect } from 'konva/lib/types';
import { merge } from 'lodash-es';
import type { ImageDTO } from 'services/api/types';
import { assert } from 'tsafe';

import type {
  CanvasBrushLineState,
  CanvasEraserLineState,
  CanvasLayerState,
  CanvasRectState,
  CanvasV2State,
  EntityRasterizedArg,
  ImageObjectAddedArg,
  PositionChangedArg,
} from './types';
import { imageDTOToImageObject, imageDTOToImageWithDims } from './types';

export const selectLayer = (state: CanvasV2State, id: string) => state.layers.entities.find((layer) => layer.id === id);
export const selectLayerOrThrow = (state: CanvasV2State, id: string) => {
  const layer = selectLayer(state, id);
  assert(layer, `Layer with id ${id} not found`);
  return layer;
};

export const layersReducers = {
  layerAdded: {
    reducer: (state, action: PayloadAction<{ id: string; overrides?: Partial<CanvasLayerState> }>) => {
      const { id } = action.payload;
      const layer: CanvasLayerState = {
        id,
        type: 'layer',
        isEnabled: true,
        objects: [],
        opacity: 1,
        position: { x: 0, y: 0 },
      };
      merge(layer, action.payload.overrides);
      state.layers.entities.push(layer);
      state.selectedEntityIdentifier = { type: 'layer', id };
      state.layers.imageCache = null;
    },
    prepare: (payload: { overrides?: Partial<CanvasLayerState> }) => ({
      payload: { ...payload, id: getPrefixedId('layer') },
    }),
  },
  layerRecalled: (state, action: PayloadAction<{ data: CanvasLayerState }>) => {
    const { data } = action.payload;
    state.layers.entities.push(data);
    state.selectedEntityIdentifier = { type: 'layer', id: data.id };
    state.layers.imageCache = null;
  },
  layerIsEnabledToggled: (state, action: PayloadAction<{ id: string }>) => {
    const { id } = action.payload;
    const layer = selectLayer(state, id);
    if (!layer) {
      return;
    }
    layer.isEnabled = !layer.isEnabled;
    state.layers.imageCache = null;
  },
  layerTranslated: (state, action: PayloadAction<PositionChangedArg>) => {
    const { id, position } = action.payload;
    const layer = selectLayer(state, id);
    if (!layer) {
      return;
    }
    layer.position = position;
    state.layers.imageCache = null;
  },
  layerBboxChanged: (state, action: PayloadAction<{ id: string; bbox: IRect | null }>) => {
    const { id, bbox } = action.payload;
    const layer = selectLayer(state, id);
    if (!layer) {
      return;
    }
    if (bbox === null) {
      // TODO(psyche): Clear objects when bbox is cleared - right now this doesn't work bc bbox calculation for layers
      // doesn't work - always returns null
      // layer.objects = [];
    }
  },
  layerReset: (state, action: PayloadAction<{ id: string }>) => {
    const { id } = action.payload;
    const layer = selectLayer(state, id);
    if (!layer) {
      return;
    }
    layer.isEnabled = true;
    layer.objects = [];
    state.layers.imageCache = null;
    layer.position = { x: 0, y: 0 };
  },
  layerDeleted: (state, action: PayloadAction<{ id: string }>) => {
    const { id } = action.payload;
    state.layers.entities = state.layers.entities.filter((l) => l.id !== id);
    state.layers.imageCache = null;
  },
  layerAllDeleted: (state) => {
    state.layers.entities = [];
    state.layers.imageCache = null;
  },
  layerOpacityChanged: (state, action: PayloadAction<{ id: string; opacity: number }>) => {
    const { id, opacity } = action.payload;
    const layer = selectLayer(state, id);
    if (!layer) {
      return;
    }
    layer.opacity = opacity;
    state.layers.imageCache = null;
  },
  layerMovedForwardOne: (state, action: PayloadAction<{ id: string }>) => {
    const { id } = action.payload;
    const layer = selectLayer(state, id);
    if (!layer) {
      return;
    }
    moveOneToEnd(state.layers.entities, layer);
    state.layers.imageCache = null;
  },
  layerMovedToFront: (state, action: PayloadAction<{ id: string }>) => {
    const { id } = action.payload;
    const layer = selectLayer(state, id);
    if (!layer) {
      return;
    }
    moveToEnd(state.layers.entities, layer);
    state.layers.imageCache = null;
  },
  layerMovedBackwardOne: (state, action: PayloadAction<{ id: string }>) => {
    const { id } = action.payload;
    const layer = selectLayer(state, id);
    if (!layer) {
      return;
    }
    moveOneToStart(state.layers.entities, layer);
    state.layers.imageCache = null;
  },
  layerMovedToBack: (state, action: PayloadAction<{ id: string }>) => {
    const { id } = action.payload;
    const layer = selectLayer(state, id);
    if (!layer) {
      return;
    }
    moveToStart(state.layers.entities, layer);
    state.layers.imageCache = null;
  },
  layerBrushLineAdded: (state, action: PayloadAction<{ id: string; brushLine: CanvasBrushLineState }>) => {
    const { id, brushLine } = action.payload;
    const layer = selectLayer(state, id);
    if (!layer) {
      return;
    }

    layer.objects.push(brushLine);
    state.layers.imageCache = null;
  },
  layerEraserLineAdded: (state, action: PayloadAction<{ id: string; eraserLine: CanvasEraserLineState }>) => {
    const { id, eraserLine } = action.payload;
    const layer = selectLayer(state, id);
    if (!layer) {
      return;
    }

    layer.objects.push(eraserLine);
    state.layers.imageCache = null;
  },
  layerRectAdded: (state, action: PayloadAction<{ id: string; rect: CanvasRectState }>) => {
    const { id, rect } = action.payload;
    const layer = selectLayer(state, id);
    if (!layer) {
      return;
    }

    layer.objects.push(rect);
    state.layers.imageCache = null;
  },
  layerImageAdded: (
    state,
    action: PayloadAction<ImageObjectAddedArg & { objectId: string; pos?: { x: number; y: number } }>
  ) => {
    const { id, imageDTO, pos } = action.payload;
    const layer = selectLayer(state, id);
    if (!layer) {
      return;
    }
    const imageObject = imageDTOToImageObject(imageDTO);
    if (pos) {
      imageObject.x = pos.x;
      imageObject.y = pos.y;
    }
    layer.objects.push(imageObject);
    state.layers.imageCache = null;
  },
  layerImageCacheChanged: (state, action: PayloadAction<{ imageDTO: ImageDTO | null }>) => {
    const { imageDTO } = action.payload;
    state.layers.imageCache = imageDTO ? imageDTOToImageWithDims(imageDTO) : null;
  },
  layerRasterized: (state, action: PayloadAction<EntityRasterizedArg>) => {
    const { id, imageObject, position } = action.payload;
    const layer = selectLayer(state, id);
    if (!layer) {
      return;
    }
    layer.objects = [imageObject];
    layer.position = position;
    state.layers.imageCache = null;
  },
} satisfies SliceCaseReducers<CanvasV2State>;
