import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  FormsModule,
  ReactiveFormsModule,
  FormControl,
  FormGroup,
  FormBuilder,
  FormArray,
  Validators
} from '@angular/forms';


import { debounceTime, switchMap, map, filter, catchError, tap } from 'rxjs/operators';
import { Observable, of } from 'rxjs';
import { ReceptionService } from '../services/reception.service';
import { LoadingService } from '../services/loading.service';

@Component({
  standalone: true,
  selector: 'app-recepcion-form',
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
  ],
  templateUrl: './recepcion-form.component.html'
})
export class RecepcionFormComponent {
  private receptionService = inject(ReceptionService);
  private fb = inject(FormBuilder);
  private loadingService = inject(LoadingService)

  ordenControl = new FormControl('');
  ordenesFiltradas$: Observable<any[]> = of([]);
  mostrarLista = false;
  products: any[] = [];
  po: any[] = [];

  form: FormGroup = this.fb.group({
    ordenCompra: ['', Validators.required],
    guia: [''],
    factura: [''],
    proveedor: [''],
    cliente: [''],
    fecha: [''],
    ingreso: [true],
    devolucion: [false],
    observaciones: [''],
    productos: this.fb.array([])
  });

  ngOnInit() {
    this.ordenesFiltradas$ = this.ordenControl.valueChanges.pipe(
      debounceTime(300),
      filter((valor: any): valor is string => typeof valor === 'string' && valor.length >= 3),
  
      tap(() => this.loadingService.show('Buscando órdenes...')),  // 👈 Mostrar loader
  
      switchMap(valor =>
        this.receptionService.findOrdersByNumber(valor).pipe(
          tap(() => this.loadingService.hide()),                    // 👈 Ocultar loader al responder
          catchError(() => {
            this.loadingService.hide();
            return of([]); // manejar error devolviendo vacío
          })
        )
      ),
  
      map(resp => resp?.data || [])
    );
  }
  

  selectedOrder(poNumber: string) {
    this.loadingService.show('Cargando orden de compra')
    this.receptionService.getOrderData(poNumber).subscribe(response => {
      const data = response?.data || [];
      if (!data.length) return;
  
      const orden = data[0]; // asumimos que la orden es única (puedes mapear más si hay varios)
  
      // 1. Rellenar encabezado
      this.form.patchValue({
        ordenCompra: orden.NumeroOrdenCompra?.trim() || '',
        proveedor: orden.NombreProveedor?.trim() || '',
        cliente: orden.IDProveedor?.trim() || '',
        fecha: orden.FechaDocumento?.substring(0, 10) || '',
        factura: orden.NumeroRecepcionCompra?.trim() || ''
      });
  
      // 2. Limpiar productos existentes
      this.productos.clear();
  
      // 3. Llenar productos desde data
      for (const p of data) {
        this.productos.push(this.fb.group({
          item: p.NumeroArticulo?.trim() || '',
          numeroParte: p.NumeroArticulo?.trim() || '',
          nombre: p.DescripcionArticulo?.trim() || '',
          cantidad: p.CantidadOrdenada || '',
          vencimiento: p.FechaVencimiento?.substring(0, 10) || '',
          lote: '',
          tamanoMuestra: '',
          etiquetaFabrica: '',
          estadoCalidad: '',
          bodega: '',
          compartimiento: '',
          pl: false,
          f: false,
          li: false,
          di: false,
          ca: false,
          empaque: this.fb.group({
            b: false,
            h: false,
            r: false,
            a: false,
            m: false,
            o: false,
            temp: ''
          })
        }));
      }
      this.loadingService.hide()
      this.mostrarLista = false;
    });
  }
  

  displayOrden(orden: any): string {
    return orden?.NumeroOrdenCompra?.trim() || '';
  }

  get productos(): FormArray {
    return this.form.get('productos') as FormArray;
  }

  createProducto(): FormGroup {
    return this.fb.group({
      item: [''],
      numeroParte: [''],
      nombre: [''],
      cantidad: [''],
      vencimiento: [''],
      lote: [''],
      tamanoMuestra: [''],
      etiquetaFabrica: [''],
      estadoCalidad: [''],
      bodega: [''],
      compartimiento: [''],
      pl: [false],
      f: [false],
      li: [false],
      di: [false],
      ca: [false],
      empaque: this.fb.group({
        b: [false],
        h: [false],
        r: [false],
        a: [false],
        m: [false],
        o: [false],
        temp: ['']
      })
    });
  }

  seleccionarOrden(orden: any) {
    // Llenamos los datos del encabezado
    this.form.patchValue({
      ordenCompra: orden.NumeroOrdenCompra?.trim() || '',
      proveedor: orden.NombreProveedor?.trim() || '',
      cliente: orden.IDProveedor?.trim() || '',
      fecha: orden.FechaDocumento?.substring(0, 10) || '',
      factura: orden.NumeroRecepcionCompra?.trim() || ''
    });
  
    // Limpiamos productos existentes
    this.productos.clear();
  
    // Si la orden es un único ítem, lo tratamos igual como array
    const productos = [orden]; // en tu caso el backend responde así
  
    for (const p of productos) {
      this.productos.push(this.fb.group({
        item: p.NumeroArticulo?.trim() || '',
        numeroParte: p.NumeroArticulo?.trim() || '',
        nombre: p.DescripcionArticulo?.trim() || '',
        cantidad: p.CantidadOrdenada || '',
        vencimiento: p.FechaVencimiento?.substring(0, 10) || '',
        lote: '',
        tamanoMuestra: '',
        etiquetaFabrica: '',
        estadoCalidad: '',
        bodega: '',
        compartimiento: '',
        pl: false,
        f: false,
        li: false,
        di: false,
        ca: false,
        empaque: this.fb.group({
          b: false, h: false, r: false, a: false, m: false, o: false, temp: ''
        })
      }));
    }
  
    // ✅ Ocultamos la lista luego de un pequeño retraso
    setTimeout(() => {
      this.mostrarLista = false;
    }, 50);
  }
  

  ocultarListaConRetraso() {
    setTimeout(() => {
      this.mostrarLista = false;
    }, 150); // da tiempo al click antes de cerrar
  }

  removeProducto(index: number) {
    if (confirm('¿Deseas eliminar este producto?')) {
      this.productos.removeAt(index);
    }
  }

  addProducto() {
    this.productos.push(this.createProducto());
  }

  guardar() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const payload = this.form.value;
    console.log('Enviando al backend:', payload);
    // Aquí iría la llamada a this.miServicio.guardar(payload)...
  }
}
