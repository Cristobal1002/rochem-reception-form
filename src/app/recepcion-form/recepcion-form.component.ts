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
  estadoCerrado = false;

  form: FormGroup = this.fb.group({
    idRecepcion: [null], // ✅ AGREGADO
    ordenCompra: ['', Validators.required],
    guia: [''],
    factura: [''],
    proveedor: [''],
    cliente: [''],
    fecha: [''],
    fechaRecibo: [this.hoy()],
    ingreso: [true],
    devolucion: [false],
    observaciones: [''],
    productos: this.fb.array([]),
    estado: ['Borrador'],
  });

  ngOnInit() {
    this.ordenesFiltradas$ = this.ordenControl.valueChanges.pipe(
      debounceTime(300),
      filter((valor: any): valor is string => typeof valor === 'string' && valor.length >= 3),
      tap(() => this.loadingService.show('Buscando órdenes...')),
      switchMap(valor =>
        this.receptionService.buscarOrdenesCombinadas(valor)
      ),
      tap(() => this.loadingService.hide()),
      catchError(() => {
        this.loadingService.hide();
        return of([]);
      }),
      map(resp => resp?.data || [])
    );
    this.form.get('fechaRecibo')?.setValue(this.hoy());
  }
  

  selectedOrder(poNumber: string, source: 'ERP' | 'Guardado') {
    this.loadingService.show('Cargando orden');
  
    const observable = source === 'ERP'
      ? this.receptionService.getOrderData(poNumber)
      : this.receptionService.getSavedReception(poNumber);
  
    observable.subscribe({
      next: (response) => {
        if (!response?.data) {
          this.loadingService.hide();
          return;
        }
  
        if (source === 'ERP') {
          if (Array.isArray(response.data) && response.data.length > 0) {
            this.cargarOrdenDesdeERP(response.data);
          }
        } else {
          this.cargarOrdenGuardada(response.data);
        }
  
        this.loadingService.hide();
        this.mostrarLista = false;
      },
      error: (err) => {
        this.loadingService.hide();
        console.error('Error al cargar orden:', err);
      }
    });
  }
  
  createProducto(item = '', numeroParte = '', nombre = '', cantidad = ''): FormGroup {
    return this.fb.group({
      item: [item],
      numeroParte: [numeroParte],
      nombre: [nombre],
      cantidad: [cantidad],
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
        b: [false], h: [false], r: [false], a: [false], m: [false], o: [false], temp: ['']
      })
    });
  }
  

  displayOrden(orden: any): string {
    return orden?.NumeroOrdenCompra?.trim() || '';
  }

  get productos(): FormArray {
    return this.form.get('productos') as FormArray;
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


  hoy(): string {
    const today = new Date();
    return today.toISOString().substring(0, 10);
  }

  imprimir() {
    const contenido = document.querySelector('.print-area')?.innerHTML;
    if (!contenido) {
      alert('No se pudo encontrar el contenido para imprimir.');
      return;
    }
  
    const ventana = window.open('', '_blank', 'width=1000,height=1000');
    if (ventana) {
      ventana.document.write(`
        <html>
          <head>
            <title>Recepción de Productos</title>
            <style>
              @page {
                size: landscape;
                margin: 1cm;
              }
              body { font-family: Arial, sans-serif; padding: 20px; }
              table { width: 100%; border-collapse: collapse; font-size: 11px; }
              th, td { border: 1px solid #ccc; padding: 4px; text-align: center; }
              .input { border: none; width: 100%; font-size: 11px; }
              input[type="checkbox"] { transform: scale(1.2); margin: 2px; }
              h3 { margin-bottom: 1rem; font-size: 18px; }
              label { font-weight: bold; font-size: 12px; }
              input[readonly] { background-color: #f9f9f9; }
              .no-print { display: none !important; }
            </style>
          </head>
          <body onload="window.print(); window.close();">
            ${contenido}
          </body>
        </html>
      `);
      ventana.document.close();
    }
  }
  
  guardar() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
  
    const payload = this.form.value;
  
    this.loadingService.show('Guardando recepción...');
  
    this.receptionService.guardarRecepcion(payload).subscribe({
      next: (resp) => {
        this.loadingService.hide();
        alert('✅ Recepción guardada exitosamente.');
  
        // Si deseas reiniciar el formulario:
        this.form.reset();
        this.productos.clear();
        this.form.get('fechaRecibo')?.setValue(this.hoy());
      },
      error: (error) => {
        this.loadingService.hide();
        console.error('Error al guardar recepción:', error);
        alert('❌ Error al guardar recepción. Revisa la consola para más detalles.');
      }
    });
  }

  private cargarOrdenDesdeERP(data: any[]) {
    const orden = data[0];
  
    this.form.patchValue({
      ordenCompra: orden.NumeroOrdenCompra?.trim() || '',
      proveedor: orden.NombreProveedor?.trim() || '',
      cliente: orden.IDProveedor?.trim() || '',
      fecha: orden.FechaDocumento?.substring(0, 10) || '',
      factura: orden.NumeroRecepcionCompra?.trim() || '',
      estado: 'Borrador' // por defecto
    });
  
    this.productos.clear();
  
    for (const p of data) {
      this.productos.push(this.createProducto(p.NumeroArticulo, p.NumeroArticulo, p.DescripcionArticulo, p.CantidadOrdenada));
  
      if (p.EsKit && p.Componentes?.length) {
        for (const c of p.Componentes) {
          this.productos.push(this.createProducto('', c.Componente, c.Descripcion, ''));
        }
      }
    }
  }

  private cargarOrdenGuardada(data: any) {
    const encabezado = data;
    const productos = data.productos || [];
  
    const formatDate = (value: string) => {
      if (!value) return '';
      return value.substring(0, 10);
    };
  
    this.form.patchValue({
      idRecepcion: encabezado.IdRecepcion || null, // ✅ Asegura que se cargue
      ordenCompra: encabezado.NumeroOrdenCompra?.trim() || '',
      proveedor: encabezado.Proveedor?.trim() || '',
      cliente: encabezado.IDProveedor?.trim() || '',
      fecha: this.formatFecha(encabezado.FechaOC || encabezado.FechaDocumento),
      guia: encabezado.Guia?.trim() || '',
      factura: encabezado.Factura?.trim() || '',
      fechaRecibo: this.formatFecha(encabezado.FechaRecepcion),
      ingreso: encabezado.Ingreso,
      devolucion: encabezado.Devolucion,
      observaciones: encabezado.Observaciones || '',
      estado: encabezado.Estado || 'Borrador'
    });
  
    this.productos.clear();
  
    for (const p of productos) {
      this.productos.push(this.fb.group({
        item: [p.Item || ''],
        numeroParte: [p.NumeroParte || ''],
        nombre: [p.NombreProducto || ''],
        cantidad: [p.Cantidad || ''],
        vencimiento: [formatDate(p.FechaVencimiento)],
        lote: [p.Lote || ''],
        tamanoMuestra: [p.TamanoMuestra || ''],
        etiquetaFabrica: [p.EtiquetaFabrica || ''],
        estadoCalidad: [p.EstadoCalidad || ''],
        bodega: [p.Bodega || ''],
        compartimiento: [p.Compartimiento || ''],
        pl: [p.PL || false],
        f: [p.F || false],
        li: [p.LI || false],
        di: [p.DI || false],
        ca: [p.CA || false],
        empaque: this.fb.group({
          b: [p.Empaque_B || false],
          h: [p.Empaque_H || false],
          r: [p.Empaque_R || false],
          a: [p.Empaque_A || false],
          m: [p.Empaque_M || false],
          o: [p.Empaque_O || false],
          temp: [p.Empaque_Temp || '']
        })
      }));
    }
  
    // 🔒 Manejo de estado cerrado
    this.estadoCerrado = encabezado.Estado === 'Cerrado';
  
    if (this.estadoCerrado) {
      this.form.disable();
    } else {
      this.form.enable();
    }
  }

  private formatFecha(valor: any): string {
    if (!valor) return '';
    const fecha = new Date(valor);
    return fecha.toISOString().substring(0, 10);
  }
  
}
