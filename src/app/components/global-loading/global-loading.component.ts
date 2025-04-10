import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { LoadingService } from '../../services/loading.service';

@Component({
  selector: 'app-global-loading',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './global-loading.component.html',
  styleUrl: './global-loading.component.css'
})
export class GlobalLoadingComponent {
  isLoading: any
  loadingMessage: any

  constructor(private loadingService: LoadingService) {
    this.isLoading = this.loadingService.loading$;
    this.loadingMessage = this.loadingService.message$; // Nuevo observable del mensaje
  }
}