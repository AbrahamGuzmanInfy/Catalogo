import { provideHttpClient } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { ProductsListComponent } from './products-list.component';

describe('ProductsListComponent', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ProductsListComponent],
      providers: [provideHttpClient()],
    })
      .overrideComponent(ProductsListComponent, {
        set: { template: '' },
      })
      .compileComponents();
  });

  it('should create', () => {
    const fixture = TestBed.createComponent(ProductsListComponent);
    expect(fixture.componentInstance).toBeTruthy();
  });
});
