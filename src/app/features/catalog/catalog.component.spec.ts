import { provideHttpClient } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { CatalogComponent } from './catalog.component';

describe('CatalogComponent', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CatalogComponent],
      providers: [provideHttpClient()],
    })
      .overrideComponent(CatalogComponent, {
        set: { template: '' },
      })
      .compileComponents();
  });

  it('should create', () => {
    const fixture = TestBed.createComponent(CatalogComponent);
    expect(fixture.componentInstance).toBeTruthy();
  });
});
