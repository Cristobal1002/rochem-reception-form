import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class LoadingService {
  private loadingSubject = new BehaviorSubject<boolean>(false);
  private messageSubject = new BehaviorSubject<string>('Loading...');

  loading$ = this.loadingSubject.asObservable();
  message$ = this.messageSubject.asObservable(); // Observable del mensaje

  show(message: string = 'Cargando...') {
    this.messageSubject.next(message); // Cambia el mensaje
    this.loadingSubject.next(true);
  }

  hide() {
    this.loadingSubject.next(false);
  }
}