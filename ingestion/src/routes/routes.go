package routes

import (
	"ingestion/src/controller"
	"ingestion/src/middleware"

	"github.com/go-chi/chi/v5"
)

func SetupIngestionRoutes() chi.Router {
	router := chi.NewRouter()

	router.Group(func(r chi.Router) {

		r.Use(middleware.AuthMiddleware)

		r.Post("/upload" , controller.UploadMaterial)
		r.Get("/get/{id}" , controller.GetMaterialByID )
		r.Get("/get" , controller.GetMaterialByUserID)
		r.Post("/upload/{id}" , controller.UploadMaterialByID)
	}) 



	return router
}