package service

import (
	"errors"
	"management/src/models"
	"math/rand"
	"time"

	"go.mongodb.org/mongo-driver/bson/primitive"
)

// --------------- MAIN SERVICE FUNCTION ------------------

func GenerateSeatingArrangement(examID string, students []models.Student, rooms []models.Room) (*models.SeatingArrangementList, error) {

	// group by branch
	branchMap := map[string][]models.Student{}
	for _, st := range students {
		branchMap[st.Branch] = append(branchMap[st.Branch], st)
	}

	rand.Seed(time.Now().UnixNano())

	finalList := models.SeatingArrangementList{
		ID: primitive.NewObjectID(),
	}

	for _, room := range rooms {

		seats := make([][]string, room.Rows)

		// Students allowed (exclude own branch)
		var allowed []models.Student
		for b, list := range branchMap {
			if b != room.Branch {
				allowed = append(allowed, list...)
			}
		}

		if len(allowed) < room.Rows*2 {
			return nil, errors.New("not enough students for room " + room.RoomID)
		}

		// Shuffle for fairness
		rand.Shuffle(len(allowed), func(i, j int) { allowed[i], allowed[j] = allowed[j], allowed[i] })

		cse := []models.Student{}
		ece := []models.Student{}
		other := []models.Student{}

		// Split by branches
		for _, st := range allowed {
			switch st.Branch {
			case "CSE":
				cse = append(cse, st)
			case "ECE":
				ece = append(ece, st)
			default:
				other = append(other, st)
			}
		}

		// allocate bench-wise
		indexCse, indexEce, indexOther := 0, 0, 0

		for bench := 1; bench <= room.Rows; bench++ {
			row := make([]string, 2) // left & right

			if bench%2 != 0 { // odd bench → LEFT CSE, RIGHT ECE
				// LEFT = CSE
				if indexCse < len(cse) {
					row[0] = cse[indexCse].ID
					indexCse++
				} else if indexOther < len(other) {
					row[0] = other[indexOther].ID
					indexOther++
				}

				// RIGHT = ECE
				if indexEce < len(ece) {
					row[1] = ece[indexEce].ID
					indexEce++
				} else if indexOther < len(other) {
					row[1] = other[indexOther].ID
					indexOther++
				}

			} else { // even bench → LEFT ECE, RIGHT CSE

				// LEFT = ECE
				if indexEce < len(ece) {
					row[0] = ece[indexEce].ID
					indexEce++
				} else if indexOther < len(other) {
					row[0] = other[indexOther].ID
					indexOther++
				}

				// RIGHT = CSE
				if indexCse < len(cse) {
					row[1] = cse[indexCse].ID
					indexCse++
				} else if indexOther < len(other) {
					row[1] = other[indexOther].ID
					indexOther++
				}
			}

			seats[bench-1] = row
		}

		finalList.SeatingList = append(finalList.SeatingList, models.SeatingArragement{
			RoomID:            room.RoomID,
			Rows:              room.Rows,
			Columns:           room.Columns,
			StudentArragement: seats,
		})
	}

	return &finalList, nil
}

