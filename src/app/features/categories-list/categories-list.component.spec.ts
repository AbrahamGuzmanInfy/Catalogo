import { provideHttpClient } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { CategoriesListComponent } from './categories-list.component';

describe('CategoriesListComponent', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CategoriesListComponent],
      providers: [provideHttpClient()],
    })
      .overrideComponent(CategoriesListComponent, {
        set: { template: '' },
      })
      .compileComponents();
  });

  it('should create', () => {
    const fixture = TestBed.createComponent(CategoriesListComponent);
    expect(fixture.componentInstance).toBeTruthy();
  });
});
