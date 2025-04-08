import { ComponentFixture, TestBed } from '@angular/core/testing';

import { RecepcionFormComponent } from './recepcion-form.component';

describe('RecepcionFormComponent', () => {
  let component: RecepcionFormComponent;
  let fixture: ComponentFixture<RecepcionFormComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RecepcionFormComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(RecepcionFormComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
