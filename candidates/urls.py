from django.urls import path, include
from rest_framework.routers import DefaultRouter

from .views import CandidateViewSet, ApplyView, candidate_portal
from .analytics_views import analytics_view

router = DefaultRouter()
router.register(r'', CandidateViewSet, basename='candidate')

urlpatterns = [
    path('analytics/', analytics_view, name='candidate-analytics'),
    path('apply/', ApplyView.as_view(), name='candidate-apply'),
    path('portal/<int:candidate_id>/<str:token>/', candidate_portal, name='candidate-portal'),
    path('', include(router.urls)),
]
