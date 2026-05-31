import { Routes } from '@angular/router';

export const routes: Routes = [
    {path: '', loadComponent: () => import('./pages/game-panel/game-panel.component').then(m => m.GamePanelComponent)}, 
];
