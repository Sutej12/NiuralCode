from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/jobs/', include('jobs.urls')),
    path('api/candidates/', include('candidates.urls')),
    path('api/scheduling/', include('scheduling.urls')),
    path('api/interviews/', include('interviews.urls')),
    path('api/offers/', include('offers.urls')),
    path('api/onboarding/', include('onboarding.urls')),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
