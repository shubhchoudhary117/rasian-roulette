import { NgFor, NgIf } from '@angular/common';
import { Component } from '@angular/core';

@Component({
  selector: 'app-game-info-modal',
  standalone: true,
  imports: [NgFor,NgIf],
  templateUrl: './game-info-modal.component.html',
  styleUrl: './game-info-modal.component.scss'
})
export class GameInfoModalComponent {
  showModal = true;

  maxWins = [
    { bullets: 1, drums: 1, maxWin: '1.16x', rtp: '96.67%' },
    { bullets: 1, drums: 2, maxWin: '1.39x', rtp: '96.53%' },
    { bullets: 1, drums: 3, maxWin: '1.67x', rtp: '96.64%' },
    { bullets: 2, drums: 1, maxWin: '1.45x', rtp: '96.67%' },
    { bullets: 2, drums: 2, maxWin: '2.17x', rtp: '96.44%' },
    { bullets: 2, drums: 3, maxWin: '3.26x', rtp: '96.59%' },
    { bullets: 3, drums: 1, maxWin: '1.93x', rtp: '96.50%' },
    { bullets: 3, drums: 2, maxWin: '3.86x', rtp: '96.50%' },
    { bullets: 3, drums: 3, maxWin: '7.72x', rtp: '96.50%' },
    { bullets: 4, drums: 1, maxWin: '2.90x', rtp: '96.67%' },
    { bullets: 4, drums: 2, maxWin: '8.69x', rtp: '96.56%' },
    { bullets: 4, drums: 3, maxWin: '26.06x', rtp: '96.52%' },
  ];
}
