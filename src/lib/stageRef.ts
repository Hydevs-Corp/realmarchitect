import type Konva from 'konva';

let _stage: Konva.Stage | null = null;

export function setStageRef(stage: Konva.Stage | null): void {
    _stage = stage;
}

export function getStage(): Konva.Stage | null {
    return _stage;
}
