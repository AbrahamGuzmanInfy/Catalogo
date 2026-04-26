import { provideHttpClient } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { HomeShellComponent } from './home-shell.component';

describe('HomeShellComponent', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HomeShellComponent],
      providers: [provideHttpClient()],
    })
      .overrideComponent(HomeShellComponent, {
        set: { template: '' },
      })
      .compileComponents();
  });

  it('should create', () => {
    const fixture = TestBed.createComponent(HomeShellComponent);
    expect(fixture.componentInstance).toBeTruthy();
  });
});
