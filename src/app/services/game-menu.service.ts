import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

@Injectable({
    providedIn: 'root'
})
export class GameMenuService {

    private gameInfoModalSubject = new BehaviorSubject<boolean>(false);

    gameInfoModal$ = this.gameInfoModalSubject.asObservable();

    openGameInfoModal(): void {
        console.log('OPEN');
        this.gameInfoModalSubject.next(true);
    }

    closeGameInfoModal(): void {
        console.log('CLOSE');
        this.gameInfoModalSubject.next(false);
    }

    toggleGameInfoModal(): void {
        this.gameInfoModalSubject.next(
            !this.gameInfoModalSubject.value
        );
    }
}